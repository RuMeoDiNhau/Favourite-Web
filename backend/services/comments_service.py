"""Comments + emoji reactions for Knowledge articles and feed Posts.

The data model is intentionally simple: two polymorphic tables
(comments, reactions) keyed on (content_type, content_id). Two
content types share the same code path; if we ever add a third
(e.g. comments on music tracks) we just allowlist it.

The threading model is 1 level deep: a top-level comment has
parent_id=None, a reply points at the comment it replies to. The
FE only renders one indent — deeper nesting would be visual noise
in the article/post modal, and tree-building SQL gets ugly.
"""
from collections import defaultdict
from typing import Iterable

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.services.db_models import Comment, Reaction, Knowledge, Post, User


# Allowed emoji reactions. Keep the list short — the FE renders one
# button per emoji in the reactions bar. Adding a new emoji means
# adding it here AND in the FE's REACTION_EMOJIS list.
ALLOWED_EMOJIS = {'like', 'love', 'fire', 'laugh', 'wow'}

# Allowed comment target types. `music` and `game` are intentionally
# excluded — the dashboard scope decision was "Comments on Knowledge
# + Post only" to limit surface area for v1.
ALLOWED_CONTENT_TYPES = {'knowledge', 'post'}


# ---------------- Validation helpers ----------------

def _validate_content_type(content_type: str) -> str:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"content_type must be one of {sorted(ALLOWED_CONTENT_TYPES)}")
    return content_type


def _validate_emoji(emoji: str) -> str:
    if emoji not in ALLOWED_EMOJIS:
        raise ValueError(f"emoji must be one of {sorted(ALLOWED_EMOJIS)}")
    return emoji


def _content_exists(db: Session, content_type: str, content_id: int) -> bool:
    if content_type == 'knowledge':
        return db.query(Knowledge.id).filter(Knowledge.id == content_id).first() is not None
    if content_type == 'post':
        return db.query(Post.id).filter(Post.id == content_id).first() is not None
    return False


def _user_or_default(user_id: str) -> tuple[str | None, str | None]:
    """Best-effort lookup of (name, avatar_url) for the FE display.
    Missing users (deleted accounts) return None so the FE shows the
    raw user_id instead of crashing."""
    return None, None  # filled in by the route via the DB session


# ---------------- Comments ----------------

def list_comments(db: Session, content_type: str, content_id: int,
                  limit: int = 50, offset: int = 0) -> list[dict]:
    """Return a tree of comments for a target. Top-level comments
    come first ordered by created_at ASC (oldest at the top, like a
    chat thread); replies are appended under each parent.

    The 1-level structure keeps the response shape predictable and
    matches how the FE renders the list. We load the rows flat and
    assemble the tree in Python — simpler than a recursive CTE and
    fine for the row counts we expect (< a few hundred per article).
    """
    rows = (
        db.query(Comment)
        .filter(Comment.content_type == content_type, Comment.content_id == content_id)
        .order_by(Comment.created_at.asc())
        .all()
    )

    # Bulk-load user info in one query instead of N+1 lookups.
    user_ids = {c.user_id for c in rows}
    user_map = {}
    if user_ids:
        for u in db.query(User).filter(User.user_id.in_(user_ids)).all():
            user_map[u.user_id] = {
                'name': u.name,
                'avatar_url': u.avatar_url if hasattr(u, 'avatar_url') else None,
            }

    def _serialize(c: Comment) -> dict:
        u = user_map.get(c.user_id, {})
        return {
            'id': c.id,
            'user_id': c.user_id,
            'user_name': u.get('name'),
            'user_avatar_url': u.get('avatar_url'),
            'body': c.body,
            'parent_id': c.parent_id,
            'created_at': c.created_at.isoformat(),
            'replies': [],
        }

    nodes_by_id = {}
    for r in rows:
        nodes_by_id[r.id] = _serialize(r)

    roots: list[dict] = []
    for r in rows:
        node = nodes_by_id[r.id]
        if r.parent_id and r.parent_id in nodes_by_id:
            nodes_by_id[r.parent_id]['replies'].append(node)
        else:
            roots.append(node)

    # The limit applies to top-level comments, not to replies — the
    # caller asked for "the first 50 thread roots", and replies under
    # those threads travel with them.
    return roots[offset: offset + limit]


def create_comment(db: Session, user_id: str, content_type: str,
                   content_id: int, body: str,
                   parent_id: int | None = None) -> dict:
    """Insert a comment. Returns the serialized new comment.

    Body validation enforces 1..2000 chars (DB column is 2000; below
    1 rejects whitespace-only posts). Parent validation ensures the
    reply target belongs to the same content thread — replying to a
    knowledge article's comment under a Post would be a confusing
    cross-thread leak.
    """
    _validate_content_type(content_type)
    body = (body or '').strip()
    if not body or len(body) > 2000:
        raise ValueError("body must be 1..2000 characters")
    if not _content_exists(db, content_type, content_id):
        raise LookupError(f"{content_type} {content_id} not found")
    if parent_id is not None:
        parent = db.query(Comment).filter(Comment.id == parent_id).first()
        if not parent:
            raise LookupError(f"parent comment {parent_id} not found")
        if parent.content_type != content_type or parent.content_id != content_id:
            raise ValueError("parent comment belongs to a different thread")

    c = Comment(
        user_id=user_id,
        content_type=content_type,
        content_id=content_id,
        parent_id=parent_id,
        body=body,
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    # Build the response with the user's display info. We do this in
    # Python (vs. joining in the insert) because it's a single comment
    # — N+1 isn't a concern here, and the join would complicate the
    # insert path.
    user = db.query(User).filter(User.user_id == user_id).first()

    # Trigger a notification on the relevant recipient. We only fire
    # ONE notification per comment (not both reply + on-post): a
    # reply notifies the parent comment's author; a top-level
    # comment on a Post notifies the post's owner. Knowledge articles
    # have no "owner" column, so they don't trigger on_post — the
    # community is anonymous on the comment side, by design.
    # Lazy import so comments_service doesn't pull in
    # notification_service at module-load time (it imports db_models,
    # which would risk a cycle if notification_service ever needs
    # comments).
    try:
        from backend.services import notification_service
        actor_name = user.name if user else user_id
        snippet = (body[:40] + '…') if len(body) > 40 else body
        if parent_id is not None:
            # Reply → notify the parent comment's author.
            parent_row = db.query(Comment).filter(Comment.id == parent_id).first()
            target_user = parent_row.user_id if parent_row else None
            if target_user:
                notification_service.create_notification(
                    db,
                    recipient_id=target_user,
                    actor_id=user_id,
                    type_='comment_reply',
                    content_type=content_type,
                    content_id=content_id,
                    message=f'{actor_name} đã trả lời bình luận của bạn: "{snippet}"',
                )
        elif content_type == 'post':
            # Top-level on a Post → notify the post's owner.
            from backend.services.db_models import Post
            post = db.query(Post).filter(Post.id == content_id).first()
            if post and post.user_id:
                notification_service.create_notification(
                    db,
                    recipient_id=post.user_id,
                    actor_id=user_id,
                    type_='comment_on_post',
                    content_type='post',
                    content_id=content_id,
                    message=f'{actor_name} đã bình luận về bài "{post.title}": "{snippet}"',
                )
    except Exception as notif_err:
        # Notification failures must not roll back the comment.
        # We already committed above; logging is the best we can do.
        print(f'[comments_service] notification trigger failed: {notif_err}')

    return {
        'id': c.id,
        'user_id': c.user_id,
        'user_name': user.name if user else None,
        'user_avatar_url': getattr(user, 'avatar_url', None) if user else None,
        'body': c.body,
        'parent_id': c.parent_id,
        'created_at': c.created_at.isoformat(),
        'replies': [],
    }


def delete_comment(db: Session, comment_id: int, user_id: str,
                   is_admin: bool = False) -> None:
    """Delete a comment. Owner OR admin can delete.

    Cascade: replies are also deleted. We do it explicitly (vs.
    declaring ON DELETE CASCADE on the FK) because SQLite handles
    CASCADE inconsistently across versions and we'd rather be
    explicit about the behavior.
    """
    c = db.query(Comment).filter(Comment.id == comment_id).first()
    if not c:
        raise LookupError("comment not found")
    if not is_admin and c.user_id != user_id:
        raise PermissionError("not your comment")
    # Delete replies first so we don't leave dangling parent_ids.
    db.query(Comment).filter(Comment.parent_id == comment_id).delete()
    db.delete(c)
    db.commit()


# ---------------- Reactions ----------------

def list_reactions(db: Session, content_type: str, content_id: int,
                   user_id: str | None = None) -> dict:
    """Return per-emoji counts and the current user's emoji (if any).

    One query for counts (GROUP BY emoji), one for the caller's
    reaction. We initialize every allowed emoji to 0 so the FE can
    render the bar with stable keys even if no one has used a given
    emoji yet.
    """
    _validate_content_type(content_type)
    rows = (
        db.query(Reaction.emoji, func.count(Reaction.id))
        .filter(Reaction.content_type == content_type, Reaction.content_id == content_id)
        .group_by(Reaction.emoji)
        .all()
    )
    counts = {emoji: 0 for emoji in ALLOWED_EMOJIS}
    for emoji, count in rows:
        counts[emoji] = count

    my_emoji = None
    if user_id:
        my_row = (
            db.query(Reaction)
            .filter(Reaction.content_type == content_type,
                    Reaction.content_id == content_id,
                    Reaction.user_id == user_id)
            .first()
        )
        if my_row:
            my_emoji = my_row.emoji

    return {'counts': counts, 'my_emoji': my_emoji}


def set_reaction(db: Session, user_id: str, content_type: str,
                 content_id: int, emoji: str) -> dict:
    """Set the user's reaction to `emoji`. If the user already has the
    same emoji, toggle it off (delete). If a different emoji, swap
    (delete old + insert new).

    Returns the updated summary so the FE doesn't have to re-fetch.
    The unique constraint guarantees at most one row per (user,
    content); we don't need an explicit SELECT-before-INSERT check.
    """
    _validate_content_type(content_type)
    _validate_emoji(emoji)
    if not _content_exists(db, content_type, content_id):
        raise LookupError(f"{content_type} {content_id} not found")

    existing = (
        db.query(Reaction)
        .filter(Reaction.user_id == user_id,
                Reaction.content_type == content_type,
                Reaction.content_id == content_id)
        .first()
    )
    if existing and existing.emoji == emoji:
        # Toggle off: same emoji clicked again.
        db.delete(existing)
        db.commit()
    elif existing:
        # Swap: different emoji chosen.
        db.delete(existing)
        db.flush()
        db.add(Reaction(
            user_id=user_id,
            content_type=content_type,
            content_id=content_id,
            emoji=emoji,
        ))
        db.commit()
    else:
        # First-time reaction.
        db.add(Reaction(
            user_id=user_id,
            content_type=content_type,
            content_id=content_id,
            emoji=emoji,
        ))
        try:
            db.commit()
        except Exception:
            # Race: another tab inserted first. Roll back and re-read
            # the winning row.
            db.rollback()
            existing = (
                db.query(Reaction)
                .filter(Reaction.user_id == user_id,
                        Reaction.content_type == content_type,
                        Reaction.content_id == content_id)
                .first()
            )
            if existing and existing.emoji != emoji:
                db.delete(existing)
                db.add(Reaction(
                    user_id=user_id,
                    content_type=content_type,
                    content_id=content_id,
                    emoji=emoji,
                ))
                db.commit()

    return list_reactions(db, content_type, content_id, user_id=user_id)