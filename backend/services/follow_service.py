"""Service layer for the user follow graph.

Public functions:
  - follow(db, follower_id, target_id)        -> bool (now following)
  - unfollow(db, follower_id, target_id)      -> bool (now NOT following)
  - list_followers(db, user_id, limit, offset) -> list of user rows + stats
  - list_following(db, user_id, limit, offset) -> list of user rows + stats
  - follow_counts(db, user_id)                -> {'followers': N, 'following': M}
  - is_following(db, follower_id, target_id)  -> bool

Toggle semantics follow the bookmarks pattern: INSERT, catch
IntegrityError, return new state. Self-follow is rejected at this
layer so the route doesn't need to know the rule.
"""
from typing import List, Dict, Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.services.db_models import Follow, User


class FollowError(ValueError):
    """Domain error for invalid follow operations (self-follow, unknown
    target). Routes map this to HTTP 400; PermissionError to 403."""


def _ensure_target_exists(db: Session, target_id: str) -> None:
    exists = db.query(User.user_id).filter(User.user_id == target_id).first()
    if not exists:
        raise FollowError(f'user {target_id!r} does not exist')


def follow(db: Session, follower_id: str, target_id: str) -> bool:
    """Toggle-on follow. Returns True if the follow edge now exists.

    Raises FollowError if target_id is unknown or equals follower_id.
    """
    if follower_id == target_id:
        raise FollowError('cannot follow yourself')
    _ensure_target_exists(db, target_id)

    edge = Follow(follower_id=follower_id, target_id=target_id)
    db.add(edge)
    try:
        db.commit()
        return True
    except IntegrityError:
        # Duplicate (follower_id, target_id) — already following. Treat
        # this as success since the post-condition ("user X follows Y")
        # holds. Rollback the failed insert so the session is clean for
        # the next call.
        db.rollback()
        return True


def unfollow(db: Session, follower_id: str, target_id: str) -> bool:
    """Toggle-off follow. Returns True if the follow edge no longer
    exists. Idempotent: unfollowing someone you don't follow still
    returns True (the post-condition holds either way)."""
    deleted = (
        db.query(Follow)
        .filter(Follow.follower_id == follower_id, Follow.target_id == target_id)
        .delete()
    )
    db.commit()
    return deleted == 0  # edge absent after = True


def is_following(db: Session, follower_id: str, target_id: str) -> bool:
    return (
        db.query(Follow)
        .filter(Follow.follower_id == follower_id, Follow.target_id == target_id)
        .first()
        is not None
    )


def follow_counts(db: Session, user_id: str) -> Dict[str, int]:
    """Single round-trip pair of COUNT(*) queries. Returned shape matches
    what the FE renders in the profile header (e.g. "12 người theo dõi /
    34 đang theo dõi")."""
    followers = (
        db.query(Follow).filter(Follow.target_id == user_id).count()
    )
    following = (
        db.query(Follow).filter(Follow.follower_id == user_id).count()
    )
    return {'followers': followers, 'following': following}


def _serialize_user(user: User) -> Dict[str, Any]:
    """Subset of User fields safe to expose publicly. Mirrors what
    /users/{id}/profile returns (minus stats — those are computed in
    the route)."""
    return {
        'user_id': user.user_id,
        'name': user.name,
        'department': user.department,
        'role': user.role,
    }


def list_followers(
    db: Session, user_id: str, limit: int = 50, offset: int = 0,
) -> List[Dict[str, Any]]:
    """Users who follow `user_id`, newest first. Joins Follow→User so we
    can return the display fields in one round-trip."""
    rows = (
        db.query(User)
        .join(Follow, Follow.follower_id == User.user_id)
        .filter(Follow.target_id == user_id)
        .order_by(Follow.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_serialize_user(u) for u in rows]


def list_following(
    db: Session, user_id: str, limit: int = 50, offset: int = 0,
) -> List[Dict[str, Any]]:
    """Users that `user_id` follows, newest first. Mirror of
    list_followers."""
    rows = (
        db.query(User)
        .join(Follow, Follow.target_id == User.user_id)
        .filter(Follow.follower_id == user_id)
        .order_by(Follow.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_serialize_user(u) for u in rows]
