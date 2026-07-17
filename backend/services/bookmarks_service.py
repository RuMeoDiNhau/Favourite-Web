"""Bookmarks: per-user saves on content items (Knowledge articles, Posts,
Games, Music tracks). Lighter than comments_service because there's no
tree, no reactions bar, and no notification cascade — just a flat
per-user list of saved items.

The toggle operation is the interesting one: the FE uses an
optimistic-update pattern, so the service must return the new
state ("is it bookmarked now?"). Insert + IntegrityError → delete is
the only race-safe way to express "toggle" without a SELECT-then-
INSERT window.
"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.services.db_models import Bookmark, Knowledge, Post, Game, Music


# All four content types. The FE wires the same 🔖 button on
# Knowledge cards, Post cards, Game cards, and Music cards; the
# allowlist just gates which content_types the BE will accept.
ALLOWED_CONTENT_TYPES = {'knowledge', 'post', 'music', 'game'}

# Cap per user. 200 is enough for an MVP — at that scale the user
# should be using a real read-later service. We don't want a hostile
# user to flood the table with one-click-spam to one row, then
# accumulate thousands more by content_id enumeration either, since
# the unique constraint already blocks duplicate keys per content.
MAX_BOOKMARKS_PER_USER = 200


def _validate_content_type(content_type: str) -> str:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"content_type must be one of {sorted(ALLOWED_CONTENT_TYPES)}")
    return content_type


def _content_exists(db: Session, content_type: str, content_id: int) -> bool:
    if content_type == 'knowledge':
        return db.query(Knowledge.id).filter(Knowledge.id == content_id).first() is not None
    if content_type == 'post':
        return db.query(Post.id).filter(Post.id == content_id).first() is not None
    if content_type == 'music':
        return db.query(Music.id).filter(Music.id == content_id).first() is not None
    if content_type == 'game':
        return db.query(Game.id).filter(Game.id == content_id).first() is not None
    return False


def toggle_bookmark(db: Session, user_id: str, content_type: str,
                    content_id: int) -> dict:
    """Toggle the bookmark. Returns the new state so the FE doesn't
    need a second round-trip to refresh its UI.

    Race-safe: relies on the unique constraint. INSERT → already there
    → IntegrityError → delete the existing row. No SELECT-then-INSERT
    window where two concurrent clicks could each see "missing" and
    both try to insert.
    """
    _validate_content_type(content_type)
    if not _content_exists(db, content_type, content_id):
        raise LookupError(f"{content_type} {content_id} not found")

    existing = (
        db.query(Bookmark)
        .filter(Bookmark.user_id == user_id,
                Bookmark.content_type == content_type,
                Bookmark.content_id == content_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {'bookmarked': False}
    # Cap check before insert to give a meaningful 4xx instead of a
    # duplicate row.
    count = (
        db.query(Bookmark)
        .filter(Bookmark.user_id == user_id)
        .count()
    )
    if count >= MAX_BOOKMARKS_PER_USER:
        raise ValueError(f"Bookmark limit ({MAX_BOOKMARKS_PER_USER}) reached")
    bm = Bookmark(user_id=user_id, content_type=content_type, content_id=content_id)
    db.add(bm)
    try:
        db.commit()
    except IntegrityError:
        # Race: another tab inserted first. Roll back, recompute state.
        db.rollback()
        existing = (
            db.query(Bookmark)
            .filter(Bookmark.user_id == user_id,
                    Bookmark.content_type == content_type,
                    Bookmark.content_id == content_id)
            .first()
        )
        return {'bookmarked': existing is not None}
    return {'bookmarked': True}


def list_bookmarks(db: Session, user_id: str,
                   content_type: str | None = None,
                   limit: int = 100, offset: int = 0) -> list[dict]:
    """List a user's bookmarks as denormalized rows the FE can render
    without further lookups. Each row carries title/snippet/thumbnail
    so the bookmarks page works offline-ish (one BE call → list of
    cards with everything needed).

    We do separate fetches for Knowledge and Posts instead of a
    polymorphic join, because their schemas differ enough that a UNION
    + Python-side reshape ends up being the same number of queries and
    far more readable.

    Order: most recently saved first (matches the "last thing I saved"
    use case the bookmarks page is built for).
    """
    q = db.query(Bookmark).filter(Bookmark.user_id == user_id)
    if content_type:
        _validate_content_type(content_type)
        q = q.filter(Bookmark.content_type == content_type)
    q = q.order_by(Bookmark.created_at.desc())

    rows = q.limit(limit + offset).all()
    page = rows[offset: offset + limit]

    if not page:
        return []

    # Bulk-load referenced content rows (one query per type, not N+1).
    knowledge_ids = [r.content_id for r in page if r.content_type == 'knowledge']
    post_ids = [r.content_id for r in page if r.content_type == 'post']
    music_ids = [r.content_id for r in page if r.content_type == 'music']
    game_ids = [r.content_id for r in page if r.content_type == 'game']

    knowledge_map = {}
    if knowledge_ids:
        for k in db.query(Knowledge).filter(Knowledge.id.in_(knowledge_ids)).all():
            knowledge_map[k.id] = k
    post_map = {}
    if post_ids:
        for p in db.query(Post).filter(Post.id.in_(post_ids)).all():
            post_map[p.id] = p
    music_map = {}
    if music_ids:
        for m in db.query(Music).filter(Music.id.in_(music_ids)).all():
            music_map[m.id] = m
    game_map = {}
    if game_ids:
        for g in db.query(Game).filter(Game.id.in_(game_ids)).all():
            game_map[g.id] = g

    out = []
    for r in page:
        item = {
            'id': r.id,
            'content_type': r.content_type,
            'content_id': r.content_id,
            'created_at': r.created_at.isoformat(),
        }
        if r.content_type == 'knowledge' and r.content_id in knowledge_map:
            k = knowledge_map[r.content_id]
            item.update({
                'title': k.title,
                'snippet': k.description[:120] if k.description else '',
                'category': k.category,
                'author': k.author,
            })
        elif r.content_type == 'post' and r.content_id in post_map:
            p = post_map[r.content_id]
            item.update({
                'title': p.title,
                'snippet': (p.description or '')[:120],
                'thumbnail': p.thumbnail,
                'media_url': p.media_url,
                'post_type': p.post_type,
                'user_id': p.user_id,
            })
        elif r.content_type == 'music' and r.content_id in music_map:
            m = music_map[r.content_id]
            item.update({
                'title': m.title,
                'artist': m.artist,
                'snippet': (m.genre or '')[:120],
                'duration': m.duration,
            })
        elif r.content_type == 'game' and r.content_id in game_map:
            g = game_map[r.content_id]
            item.update({
                'title': g.title,
                'snippet': (g.description or '')[:120],
                'category': g.category,
                'image_url': g.image_url,
            })
        out.append(item)
    return out


def list_bookmark_ids(db: Session, user_id: str,
                     content_type: str | None = None) -> list[dict]:
    """Lightweight list — for the FE to know which items to render in
    bookmarked state when a feed/list view first loads. Returns
    (content_type, content_id) tuples, no extra columns.

    The FE batches this on app mount via /bookmarks/ids and uses the
    returned set to set the 🔖 filled/empty state on every card it
    renders thereafter — one round-trip, regardless of page size.
    """
    q = db.query(Bookmark.content_type, Bookmark.content_id).filter(Bookmark.user_id == user_id)
    if content_type:
        _validate_content_type(content_type)
        q = q.filter(Bookmark.content_type == content_type)
    return [
        {'content_type': ct, 'content_id': cid}
        for ct, cid in q.all()
    ]


def remove_bookmark(db: Session, user_id: str, content_type: str,
                    content_id: int) -> None:
    """Delete a bookmark. Idempotent — no error if the bookmark didn't
    exist, so FE double-clicks can't 404.
    """
    _validate_content_type(content_type)
    db.query(Bookmark).filter(
        Bookmark.user_id == user_id,
        Bookmark.content_type == content_type,
        Bookmark.content_id == content_id,
    ).delete()
    db.commit()
