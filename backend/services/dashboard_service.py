"""Personal Dashboard service — per-user content activity aggregation.

Sits next to the content services (games/music/knowledge) but the unit
of work is a single user across all content types. The insight response
is a dict (not a Pydantic model) because the shape is FE-specific and
changes more often than the wire model — keeping it loose here means we
can add fields without churn.
"""
import csv
import io
import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.services.db_models import (
    Knowledge, Music, Game, Post, UserActivity, Follow, User,
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
            # ISO-format the timestamp so FastAPI's default JSON
            # encoder doesn't choke on the datetime object. Without
            # this the response is fine when Pydantic serializes it,
            # but a raw `dict(...)` return in this route bypasses
            # Pydantic and would emit a `TypeError: Object of type
            # datetime is not JSON serializable`.
            'created_at': r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


def get_friends_activity(db: Session, viewer_id: str, limit: int = 20) -> list[dict]:
    """Return the latest `limit` content events performed by users
    that `viewer_id` follows.

    Tier 3 N: this is the "friends activity feed" — uses the Follow
    table from Tier 3 J. We pull the set of followed users in one
    query (no offset/pagination — the set is small in practice),
    then SELECT their activity events with a single IN-filter, then
    batch-fetch the content rows for title/cover in 3 follow-up
    queries.

    We dedupe so the same (user, content, event) doesn't appear
    twice in a row (the FE would look broken showing two consecutive
    "X đã xem bài Y" cards). Dedup keeps the most recent row per
    triplet.

    Returns an empty list if the user follows nobody — the FE
    renders an invite-to-follow state instead of an error.
    """
    if limit < 1 or limit > 100:
        limit = 20

    followed_ids = [
        row[0] for row in
        db.query(Follow.target_id).filter(Follow.follower_id == viewer_id).all()
    ]
    if not followed_ids:
        return []

    # Pull a wider window than `limit` so dedupe-by-triplet has
    # enough candidates. 5x is enough in practice — duplicates are
    # rare because the activity table itself dedupes click storms
    # at 60s intervals.
    raw_limit = limit * 5
    rows = (
        db.query(UserActivity)
        .filter(UserActivity.user_id.in_(followed_ids))
        .order_by(UserActivity.created_at.desc())
        .limit(raw_limit)
        .all()
    )
    if not rows:
        return []

    # Dedupe by (user_id, content_type, content_id, event_type).
    # Keep the most recent occurrence (rows already sorted desc).
    seen = set()
    deduped: list[UserActivity] = []
    for r in rows:
        key = (r.user_id, r.content_type, r.content_id, r.event_type)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(r)
        if len(deduped) >= limit:
            break

    # Bulk-fetch actor names + content metadata. We need actor names
    # to render "X đã xem Y" cards; the FE links each row to the
    # actor's profile, so the user_id alone isn't enough.
    actor_rows = db.query(User).filter(User.user_id.in_(followed_ids)).all()
    actor_by_id = {u.user_id: u for u in actor_rows}

    by_type: dict[str, list[int]] = defaultdict(list)
    for r in deduped:
        by_type[r.content_type].append(r.content_id)

    title_by_key: dict[tuple[str, int], str | None] = {}
    cover_by_key: dict[tuple[str, int], str | None] = {}
    if 'knowledge' in by_type:
        for a in db.query(Knowledge).filter(Knowledge.id.in_(by_type['knowledge'])).all():
            title_by_key[('knowledge', a.id)] = a.title
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

    out = []
    for r in deduped:
        actor = actor_by_id.get(r.user_id)
        out.append({
            'id': r.id,
            'content_type': r.content_type,
            'content_id': r.content_id,
            'event_type': r.event_type,
            'title': title_by_key.get((r.content_type, r.content_id)),
            'cover_url': cover_by_key.get((r.content_type, r.content_id)),
            # ISO-format the timestamp — see the same conversion
            # in get_recent_activity. FastAPI's default JSON encoder
            # doesn't natively serialize datetime objects.
            'created_at': r.created_at.isoformat() if r.created_at else None,
            # Actor metadata for the FE's "X đã Y" rendering.
            'actor_id': r.user_id,
            'actor_name': actor.name if actor else r.user_id,
        })
    return out


def export_insights(db: Session, user_id: str, days: int, fmt: str) -> tuple[bytes, str, str]:
    """Serialize the user's insights to a downloadable blob.

    Returns (body_bytes, content_type, filename). The route sets those
    on the Response so the browser triggers a file save dialog
    instead of rendering inline.

    Two formats are supported:
      - 'json' — the same dict get_user_insights returns, pretty-printed.
      - 'csv'  — a flat per-day breakdown, one row per (date,
                 content_type). The daily matrix is the most useful
                 shape for spreadsheet pivots and charts.

    We rebuild insights from scratch (don't pass the existing dict
    in) so the export is always in sync with whatever schema
    get_user_insights emits. The cost is one extra dashboard query
    per export — acceptable because exports are infrequent.
    """
    insights = get_user_insights(db, user_id, days=days)
    if fmt == 'json':
        # datetime objects aren't JSON-serializable; isoformat them.
        body = json.dumps(insights, indent=2, ensure_ascii=False, default=str).encode('utf-8')
        filename = f'favweb-insights-{user_id}-{days}d.json'
        return body, 'application/json; charset=utf-8', filename
    if fmt == 'csv':
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(['date', 'content_type', 'count'])
        for row in insights['daily']:
            for ctype in ('knowledge', 'music', 'game', 'post'):
                writer.writerow([row['date'], ctype, row.get(ctype, 0)])
        body = buf.getvalue().encode('utf-8')
        filename = f'favweb-insights-{user_id}-{days}d.csv'
        return body, 'text/csv; charset=utf-8', filename
    raise ValueError(f"unsupported format: {fmt}")
