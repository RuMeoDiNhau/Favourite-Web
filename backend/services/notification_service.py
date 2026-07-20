"""Notification inbox for the bell icon.

The data model is intentionally simple — one row per notification,
queryable by recipient_id. There are two read paths:
  1. Bell badge: GET /notifications/unread-count returns just the
     integer count, polled every 30s by the FE.
  2. Dropdown list: GET /notifications?limit=20 returns the most
     recent N rows + the same unread_count, lazily fetched when the
     user clicks the bell.

Write path: triggered from comments_service.create_comment (parent
reply → comment_reply notification to the parent's author; top-level
on a Post → comment_on_post notification to the post's author). We
don't notify on Knowledge articles (no `user_id` owner column) or
on reactions (would generate too much noise — comment is enough).

Idempotency: create_notification dedupes within 60s for the same
(recipient, actor, type, content_type, content_id) tuple. Two users
commenting on the same post at the same time still get separate
rows — the dedup is keyed on the actor.
"""
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.services.db_models import Notification, User


# Allowlist so a typo'd "type" string doesn't end up in the DB.
# Keep this set in sync with the FE's notification-icon mapping.
ALLOWED_TYPES = {'comment_reply', 'comment_on_post'}

# 60s window. Less than that, two clicks look like one to the user;
# more than that, and a real follow-up comment gets dropped.
_DEDUP_WINDOW = timedelta(seconds=60)


def _resolve_actor_name(db: Session, actor_id: str | None) -> str | None:
    """Look up the actor's display name (denormalized into the row at
    insert time so list-notifications doesn't N+1 JOIN users)."""
    if not actor_id:
        return None
    u = db.query(User).filter(User.user_id == actor_id).first()
    return u.name if u else None


def create_notification(
    db: Session,
    recipient_id: str,
    actor_id: str | None,
    type_: str,
    content_type: str | None = None,
    content_id: int | None = None,
    message: str = '',
) -> Notification | None:
    """Insert a notification, suppressing duplicates within 60s.

    Returns the new row on insert, or None if suppressed. We never
    notify a user about their own action — the caller passes actor_id
    and we drop recipient == actor at the top.
    """
    if type_ not in ALLOWED_TYPES:
        raise ValueError(f"type must be one of {sorted(ALLOWED_TYPES)}")
    if recipient_id == actor_id:
        # Self-notifications are noise — skip silently.
        return None
    if not message:
        raise ValueError("message is required")

    cutoff = datetime.utcnow() - _DEDUP_WINDOW
    q = (
        db.query(Notification)
        .filter(
            Notification.recipient_id == recipient_id,
            Notification.actor_id == actor_id,
            Notification.type == type_,
            Notification.content_type == content_type,
            Notification.content_id == content_id,
            Notification.created_at >= cutoff,
        )
    )
    if q.first() is not None:
        return None

    n = Notification(
        recipient_id=recipient_id,
        actor_id=actor_id,
        actor_name=_resolve_actor_name(db, actor_id),
        type=type_,
        content_type=content_type,
        content_id=content_id,
        message=message,
        read=False,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


def list_notifications(
    db: Session,
    user_id: str,
    unread_only: bool = False,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    """Return the user's notifications + the total unread count.

    `unread_count` is computed in a separate COUNT query. We always
    return the total (even when unread_only filters the list) so the
    FE can reconcile the badge count with the list size — list shows
    at most `limit` rows, but the badge should reflect all unread.
    """
    q = db.query(Notification).filter(Notification.recipient_id == user_id)
    if unread_only:
        q = q.filter(Notification.read == False)
    rows = (
        q.order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    unread_count = (
        db.query(func.count(Notification.id))
        .filter(Notification.recipient_id == user_id, Notification.read == False)
        .scalar()
        or 0
    )
    return {
        'notifications': rows,
        'unread_count': unread_count,
    }


def mark_as_read(db: Session, notification_id: int, user_id: str) -> bool:
    """Mark one notification read. Returns False if it's not the
    caller's (don't leak read-state across users via 403 vs 404 — we
    silently ignore mismatches)."""
    n = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.recipient_id == user_id)
        .first()
    )
    if not n:
        return False
    if n.read:
        return True
    n.read = True
    db.commit()
    return True


def mark_all_as_read(db: Session, user_id: str) -> int:
    """Mark every unread notification for the user as read. Returns
    the number of rows updated so the FE can clear the badge."""
    rows = (
        db.query(Notification)
        .filter(Notification.recipient_id == user_id, Notification.read == False)
        .all()
    )
    count = 0
    for n in rows:
        n.read = True
        count += 1
    db.commit()
    return count


def get_unread_count(db: Session, user_id: str) -> int:
    """Cheap hot-path query for the bell badge. Hits the
    (recipient_id, read, created_at) composite index."""
    return (
        db.query(func.count(Notification.id))
        .filter(Notification.recipient_id == user_id, Notification.read == False)
        .scalar()
        or 0
    )