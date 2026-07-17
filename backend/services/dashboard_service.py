"""Personal Dashboard service — per-user content activity aggregation.

Sits next to the content services (games/music/knowledge) but the unit
of work is a single user across all content types. The insight response
is a dict (not a Pydantic model) because the shape is FE-specific and
changes more often than the wire model — keeping it loose here means we
can add fields without churn.
"""
from collections import Counter, defaultdict
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.services.db_models import (
    Knowledge, Music, Game, Post, UserActivity,
)


# Mirror the EVENT_TYPE choices used in routes.py validation so the
# dedup check in record_event stays in sync with what /activity/track
# accepts. Importing the route-level constants would create a cycle.
_VALID_CONTENT_TYPES = {'knowledge', 'music', 'game', 'post'}
_VALID_EVENT_TYPES = {'view', 'play', 'like'}

# Dedup window: same (user, content, event) within this many seconds is
# treated as a single event. The FE also fire-and-forgets a track call
# whenever a user clicks anything, so without dedup the table would
# grow 10x faster than actual engagement.
DEDUP_WINDOW_SECONDS = 60


def record_event(
    db: Session,
    user_id: str,
    content_type: str,
    content_id: int,
    event_type: str,
) -> dict:
    """Insert one activity row, deduping within DEDUP_WINDOW_SECONDS.

    Returns {recorded: bool, deduplicated: bool}. We don't raise on
    invalid content_type — the route layer is the gatekeeper; this
    function trusts its callers. The check here is just an
    defence-in-depth that returns recorded=False on bad input.
    """
    if content_type not in _VALID_CONTENT_TYPES or event_type not in _VALID_EVENT_TYPES:
        return {'recorded': False, 'deduplicated': False}

    cutoff = datetime.utcnow() - timedelta(seconds=DEDUP_WINDOW_SECONDS)
    recent = db.query(UserActivity).filter(
        UserActivity.user_id == user_id,
        UserActivity.content_type == content_type,
        UserActivity.content_id == content_id,
        UserActivity.event_type == event_type,
        UserActivity.created_at >= cutoff,
    ).first()
    if recent is not None:
        return {'recorded': False, 'deduplicated': True}

    row = UserActivity(
        user_id=user_id,
        content_type=content_type,
        content_id=content_id,
        event_type=event_type,
    )
    db.add(row)
    db.commit()
    return {'recorded': True, 'deduplicated': False}


def get_user_insights(db: Session, user_id: str, days: int = 7) -> dict:
    """Aggregate the user's activity over the last `days` days.

    Returns a dict that always has the same keys — empty users get
    zeros and empty lists, not 404, so the FE can render an empty state
    without a special code path.

    Schema:
      totals:       flat counts for the period
      daily:        list of {date, knowledge, music, game, post} — one per
                     day in the last `days`, including days with zero events
                     (so the chart shows gaps, not just spikes)
      top_categories:  [(category, count), ...] for knowledge only
      recent_articles: 3 Knowledge rows the user touched recently
      streak_days:  how many consecutive days ending today have ≥1 event
    """
    if days < 1 or days > 90:
        days = 7
    now = datetime.utcnow()
    # Floor to start-of-day so the daily bucketing is deterministic
    # regardless of when the request lands.
    today = datetime(now.year, now.month, now.day)
    cutoff = today - timedelta(days=days - 1)

    rows = db.query(UserActivity).filter(
        UserActivity.user_id == user_id,
        UserActivity.created_at >= cutoff,
    ).all()

    # Tally per (date, content_type) for the chart.
    daily_counts = defaultdict(lambda: Counter())
    for r in rows:
        d = r.created_at.date().isoformat()
        daily_counts[d][r.content_type] += 1

    # Fill in zero-days so the FE chart doesn't have to handle missing dates.
    daily = []
    for i in range(days):
        d = (today - timedelta(days=days - 1 - i)).date().isoformat()
        c = daily_counts.get(d, Counter())
        daily.append({
            'date': d,
            'knowledge': c.get('knowledge', 0),
            'music': c.get('music', 0),
            'game': c.get('game', 0),
            'post': c.get('post', 0),
        })

    # Flat totals for the stat cards.
    by_type_event = Counter()
    for r in rows:
        by_type_event[(r.content_type, r.event_type)] += 1
    totals = {
        'knowledge_views': by_type_event[('knowledge', 'view')],
        'music_plays':     by_type_event[('music', 'play')],
        'game_views':      by_type_event[('game', 'view')],
        'posts_liked':     by_type_event[('post', 'like')],
    }

    # Top knowledge categories the user engaged with — only 'view' and
    # 'like' count (not 'play' which doesn't apply to knowledge).
    cat_counter = Counter()
    knowledge_touched_ids = {
        r.content_id for r in rows
        if r.content_type == 'knowledge' and r.event_type in ('view', 'like')
    }
    if knowledge_touched_ids:
        for art in db.query(Knowledge).filter(Knowledge.id.in_(knowledge_touched_ids)).all():
            cat_counter[art.category] += 1
    top_categories = cat_counter.most_common(5)

    # The 3 most recent knowledge articles the user touched.
    recent_article_rows = sorted(
        (r for r in rows if r.content_type == 'knowledge'),
        key=lambda r: r.created_at, reverse=True,
    )[:3]
    # A user might view/like the same article multiple times in a
    # week — the activity log keeps every event so we can answer
    # "how many times did they read it?", but recent_articles is a
    # list of *articles*, not events. Dedupe by content_id, keeping
    # the most recent occurrence of each (rows are already ordered
    # by created_at desc, so first-sight wins). Without this dedupe
    # the same article can appear twice in the response, which makes
    # React warn "two children with the same key" on the FE.
    seen_ids = set()
    recent_article_ids = []
    for r in recent_article_rows:
        if r.content_id not in seen_ids:
            seen_ids.add(r.content_id)
            recent_article_ids.append(r.content_id)
    recent_articles = []
    if recent_article_ids:
        # Preserve recency order (the SQL query result is id-ordered).
        arts = {a.id: a for a in db.query(Knowledge).filter(Knowledge.id.in_(recent_article_ids)).all()}
        recent_articles = [arts[i] for i in recent_article_ids if i in arts]

    # Streak: count back from today how many consecutive days have events.
    # Stops at the first day with zero events — a user who hasn't
    # engaged for 2 days gets streak=0 even if they were active last week.
    streak = 0
    for i in range(days):
        d = (today - timedelta(days=i)).date().isoformat()
        if daily_counts.get(d):
            streak += 1
        else:
            break

    return {
        'totals': totals,
        'daily': daily,
        'top_categories': top_categories,
        'recent_articles': recent_articles,
        'streak_days': streak,
    }


def get_recent_activity(db: Session, user_id: str, limit: int = 10) -> list[dict]:
    """Return the user's last `limit` activity rows joined with a tiny
    payload about the underlying content (title + image_url where it
    exists). Pure-dict shape, sorted desc by time.

    Joins are deliberately not used — we batch-fetch by id instead. The
    N is small (≤10) so the cost is identical and the code stays
    portable to PostgreSQL (which doesn't have ILIKE but the JOIN
    pattern would be the same anyway).
    """
    if limit < 1 or limit > 50:
        limit = 10
    rows = db.query(UserActivity).filter(
        UserActivity.user_id == user_id,
    ).order_by(UserActivity.created_at.desc()).limit(limit).all()

    if not rows:
        return []

    # Bucket the ids we need to look up by content type, so we can
    # do 4 cheap queries instead of N point queries.
    by_type = defaultdict(list)
    for r in rows:
        by_type[r.content_type].append(r.content_id)

    title_by_key = {}
    cover_by_key = {}
    if 'knowledge' in by_type:
        for a in db.query(Knowledge).filter(Knowledge.id.in_(by_type['knowledge'])).all():
            title_by_key[('knowledge', a.id)] = a.title
            # Knowledge has no image_url column (cover is the default
            # 📝 emoji in the FE). cover_url stays None — the FE falls
            # back to a placeholder.
            cover_by_key[('knowledge', a.id)] = None
    if 'music' in by_type:
        for m in db.query(Music).filter(Music.id.in_(by_type['music'])).all():
            title_by_key[('music', m.id)] = m.title
            cover_by_key[('music', m.id)] = None
    if 'game' in by_type:
        for g in db.query(Game).filter(Game.id.in_(by_type['game'])).all():
            title_by_key[('game', g.id)] = g.title
            cover_by_key[('game', g.id)] = g.image_url
    if 'post' in by_type:
        for p in db.query(Post).filter(Post.id.in_(by_type['post'])).all():
            title_by_key[('post', p.id)] = p.title
            cover_by_key[('post', p.id)] = p.thumbnail

    return [
        {
            'id': r.id,
            'content_type': r.content_type,
            'content_id': r.content_id,
            'event_type': r.event_type,
            'title': title_by_key.get((r.content_type, r.content_id)),
            'cover_url': cover_by_key.get((r.content_type, r.content_id)),
            'created_at': r.created_at,
        }
        for r in rows
    ]
