"""Service layer for user-curated Collections of knowledge articles.

Public functions:
  - create_collection(db, user_id, name, description) -> dict
  - list_collections(db, user_id, limit, offset)    -> list of dict
  - get_collection(db, collection_id, user_id)     -> dict (with items)
  - update_collection(db, collection_id, user_id, name?, description?) -> dict
  - delete_collection(db, collection_id, user_id)   -> None
  - add_item(db, collection_id, user_id, content_type, content_id) -> bool
  - remove_item(db, collection_id, user_id, content_type, content_id) -> bool

Ownership semantics: every operation except list/get enforces
`user_id == collection.user_id` (or `user_id == collection.user_id`
for item ops via the parent collection). We raise LookupError for
not-found / not-yours and PermissionError for cross-user attempts —
routes map these to 404 / 403.
"""
from typing import List, Dict, Any, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.services.db_models import Collection, CollectionItem, Knowledge


class CollectionNotFound(LookupError):
    """Raised when a collection doesn't exist OR doesn't belong to
    the requesting user. We collapse both cases into the same error
    so a viewer can't probe for the existence of someone else's
    collection by id."""


class ArticleNotFound(LookupError):
    pass


# MVP scope: collections only hold knowledge articles. The polymorphic
# (content_type, content_id) column is in place so a later commit can
# extend allowlist without a schema change, but the service rejects
# anything else so the FE's "thêm vào bộ sưu tập" dropdown doesn't
# silently accept unsupported types.
ALLOWED_CONTENT_TYPES = {'knowledge'}


def _serialize_collection(c: Collection, item_count: Optional[int] = None) -> Dict[str, Any]:
    return {
        'id': c.id,
        'user_id': c.user_id,
        'name': c.name,
        'description': c.description,
        'created_at': c.created_at.isoformat() if c.created_at else None,
        # `item_count` is computed in the caller (one bulk query for
        # list endpoints). Single-collection reads get a precise count
        # because we already have the items list.
        'item_count': item_count if item_count is not None else 0,
    }


def _get_owned(db: Session, collection_id: int, user_id: str) -> Collection:
    """Fetch a collection if it exists AND belongs to user_id. Raises
    CollectionNotFound otherwise (the caller maps to 404)."""
    c = db.query(Collection).filter(Collection.id == collection_id).first()
    if not c or c.user_id != user_id:
        raise CollectionNotFound(f'collection {collection_id} not found')
    return c


def create_collection(db: Session, user_id: str, name: str, description: Optional[str] = None) -> Dict[str, Any]:
    name = (name or '').strip()
    if not name:
        raise ValueError('name is required')
    if len(name) > 255:
        raise ValueError('name too long (max 255 chars)')

    c = Collection(user_id=user_id, name=name, description=description)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _serialize_collection(c)


def list_collections(db: Session, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Returns the user's collections with `item_count` denormalized.
    Item counts come from a single GROUP BY query rather than N+1
    COUNT(*) calls — important once a user has many collections."""
    limit = max(1, min(limit, 200))
    rows = (
        db.query(Collection)
        .filter(Collection.user_id == user_id)
        .order_by(Collection.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    if not rows:
        return []

    # Bulk count: one round-trip for all collections in this page.
    ids = [c.id for c in rows]
    count_rows = (
        db.query(CollectionItem.collection_id, CollectionItem.id)
        .filter(CollectionItem.collection_id.in_(ids))
        .all()
    )
    counts: Dict[int, int] = {}
    for cid, _ in count_rows:
        counts[cid] = counts.get(cid, 0) + 1

    return [_serialize_collection(c, item_count=counts.get(c.id, 0)) for c in rows]


def get_collection(db: Session, collection_id: int, user_id: str) -> Dict[str, Any]:
    """Returns the collection plus its denormalized items (knowledge
    title + category). Public-by-collection-owner: anyone can read a
    collection if they own it; cross-user reads return 404 (same as
    not-found, see _get_owned)."""
    c = _get_owned(db, collection_id, user_id)

    items = (
        db.query(CollectionItem, Knowledge)
        .join(Knowledge, Knowledge.id == CollectionItem.content_id)
        .filter(CollectionItem.collection_id == collection_id)
        .order_by(CollectionItem.created_at.desc())
        .all()
    )
    return {
        **_serialize_collection(c, item_count=len(items)),
        'items': [
            {
                'id': ci.id,
                'content_type': ci.content_type,
                'content_id': ci.content_id,
                'title': k.title,
                'category': k.category,
                'added_at': ci.created_at.isoformat() if ci.created_at else None,
            }
            for ci, k in items
        ],
    }


def update_collection(
    db: Session,
    collection_id: int,
    user_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
) -> Dict[str, Any]:
    c = _get_owned(db, collection_id, user_id)
    if name is not None:
        name = name.strip()
        if not name:
            raise ValueError('name cannot be empty')
        if len(name) > 255:
            raise ValueError('name too long (max 255 chars)')
        c.name = name
    if description is not None:
        c.description = description
    db.commit()
    db.refresh(c)
    return _serialize_collection(c)


def delete_collection(db: Session, collection_id: int, user_id: str) -> None:
    c = _get_owned(db, collection_id, user_id)
    # Cascade items first — there's no FK ON DELETE CASCADE on
    # collection_items.collection_id because we keep the table
    # portable across SQLite/Postgres without DDL migrations.
    db.query(CollectionItem).filter(CollectionItem.collection_id == collection_id).delete()
    db.delete(c)
    db.commit()


def add_item(
    db: Session,
    collection_id: int,
    user_id: str,
    content_type: str,
    content_id: int,
) -> bool:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f'unsupported content_type: {content_type!r}')
    _get_owned(db, collection_id, user_id)

    # Validate the article exists — surfacing 404 here rather than
    # letting a dangling row sneak in is worth the extra query.
    article = db.query(Knowledge).filter(Knowledge.id == content_id).first()
    if not article:
        raise ArticleNotFound(f'article {content_id} not found')

    item = CollectionItem(
        collection_id=collection_id,
        content_type=content_type,
        content_id=content_id,
    )
    db.add(item)
    try:
        db.commit()
        return True
    except IntegrityError:
        # Already in the collection — toggle-ON is idempotent.
        db.rollback()
        return True


def remove_item(
    db: Session,
    collection_id: int,
    user_id: str,
    content_type: str,
    content_id: int,
) -> bool:
    _get_owned(db, collection_id, user_id)
    deleted = (
        db.query(CollectionItem)
        .filter(
            CollectionItem.collection_id == collection_id,
            CollectionItem.content_type == content_type,
            CollectionItem.content_id == content_id,
        )
        .delete()
    )
    db.commit()
    return deleted == 0