"""Service layer for the shared Tag vocabulary.

Public functions:
  - normalize(name)              -> str  (case + whitespace)
  - get_or_create(db, name)      -> Tag
  - search_tags(db, q, limit)    -> list of {id, name, usage_count}
  - tags_for_content(db, ct, cid) -> list of {id, name}
  - attach(db, ct, cid, names)   -> list of tag rows now attached
  - detach(db, ct, cid, name)    -> bool (now absent)
  - filter_content_ids(db, ct, names, limit, offset) -> set[int]
                                  # content ids that match ANY tag (OR)

Authorization: tag creation is open to any authed user (the
vocabulary is shared). Attaching / detaching is currently open too
— there's no per-content owner check on the tag layer, which is a
deliberate simplification for the MVP. Tightening this would mean
fetching the content row and checking its author — the BE route
that calls attach/detach can do that check.
"""
from typing import List, Dict, Any, Optional, Iterable, Set

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.services.db_models import Tag, ContentTag


def normalize(name: str) -> str:
    """Canonicalize a tag name. Lower-cased + outer whitespace
    stripped + internal runs of whitespace collapsed to a single
    space. We keep the lower-case form as the source of truth so
    'Python' and 'python' are the same tag."""
    if not name:
        return ''
    return ' '.join(name.strip().lower().split())


def get_or_create(db: Session, name: str) -> Tag:
    """Idempotent insert — find by normalized name, else create.

    The unique constraint on `name` means a concurrent insert can
    fail with IntegrityError; we recover by re-fetching the winning
    row. This keeps the API race-safe without a transaction wrapper.
    """
    norm = normalize(name)
    if not norm:
        raise ValueError('tag name cannot be empty')
    if len(norm) > 100:
        raise ValueError('tag name too long (max 100 chars)')

    existing = db.query(Tag).filter(Tag.name == norm).first()
    if existing:
        return existing

    tag = Tag(name=norm)
    db.add(tag)
    try:
        db.commit()
        db.refresh(tag)
        return tag
    except IntegrityError:
        # Lost a race — another request inserted the same name. Re-fetch.
        db.rollback()
        return db.query(Tag).filter(Tag.name == norm).first()


def search_tags(db: Session, q: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Autocomplete for the FE's tag input. We rank by usage count
    descending so the most-tagged names surface first; ties break on
    alphabetical order so the result is stable across calls.

    q must be at least 2 chars to keep the response bounded; shorter
    queries return []. Names are matched via ilike('%q%') — leading
    wildcard is OK at this scale (a few hundred rows tops)."""
    norm = normalize(q)
    if len(norm) < 2:
        return []
    limit = max(1, min(limit, 50))
    rows = (
        db.query(Tag.id, Tag.name, func.count(ContentTag.id).label('usage'))
        .outerjoin(ContentTag, ContentTag.tag_id == Tag.id)
        .filter(Tag.name.ilike(f'%{norm}%'))
        .group_by(Tag.id)
        .order_by(func.count(ContentTag.id).desc(), Tag.name.asc())
        .limit(limit)
        .all()
    )
    return [{'id': r.id, 'name': r.name, 'usage_count': int(r.usage or 0)} for r in rows]


def tags_for_content(db: Session, content_type: str, content_id: int) -> List[Dict[str, Any]]:
    """Returns the tags attached to one piece of content. Sorted by
    name so the FE rendering is deterministic."""
    rows = (
        db.query(Tag)
        .join(ContentTag, ContentTag.tag_id == Tag.id)
        .filter(ContentTag.content_type == content_type, ContentTag.content_id == content_id)
        .order_by(Tag.name.asc())
        .all()
    )
    return [{'id': t.id, 'name': t.name} for t in rows]


def attach(
    db: Session,
    content_type: str,
    content_id: int,
    names: Iterable[str],
) -> List[Dict[str, Any]]:
    """Attach a set of tag names to a piece of content. Each name
    goes through get_or_create so the vocabulary grows on demand.
    Idempotent: re-attaching the same tag is a no-op (caught by the
    unique constraint)."""
    attached: List[Dict[str, Any]] = []
    seen_ids: Set[int] = set()
    for raw in names:
        if not raw or not raw.strip():
            continue
        tag = get_or_create(db, raw)
        if tag.id in seen_ids:
            continue
        seen_ids.add(tag.id)
        link = ContentTag(tag_id=tag.id, content_type=content_type, content_id=content_id)
        db.add(link)
        try:
            db.commit()
        except IntegrityError:
            # Already attached — rollback so the session is clean for
            # the next name.
            db.rollback()
        attached.append({'id': tag.id, 'name': tag.name})
    return attached


def detach(db: Session, content_type: str, content_id: int, name: str) -> bool:
    """Remove the link between a content row and a tag by name.
    Returns True if the link is absent after the call (whether or
    not it existed beforehand). Idempotent."""
    norm = normalize(name)
    tag = db.query(Tag).filter(Tag.name == norm).first()
    if not tag:
        return True
    deleted = (
        db.query(ContentTag)
        .filter(
            ContentTag.tag_id == tag.id,
            ContentTag.content_type == content_type,
            ContentTag.content_id == content_id,
        )
        .delete()
    )
    db.commit()
    return deleted == 0


def filter_content_ids(
    db: Session,
    content_type: str,
    names: Iterable[str],
) -> Set[int]:
    """Return the set of content ids that have AT LEAST ONE of the
    requested tags (OR match — same semantics as the Knowledge
    category filter).

    Used by the route layer to intersect with the rest of the
    content query (category filter, search, pagination). The caller
    applies the set as `Knowledge.id.in_(...)` and chains other
    filters on top.

    Empty `names` returns an empty set — there's no "match all
    content" semantic here. Callers should short-circuit on empty
    input rather than treating it as 'no filter'."""
    norms = [normalize(n) for n in names if n and n.strip()]
    if not norms:
        return set()
    rows = (
        db.query(ContentTag.content_id)
        .join(Tag, Tag.id == ContentTag.tag_id)
        .filter(ContentTag.content_type == content_type, Tag.name.in_(norms))
        .distinct()
        .all()
    )
    return {r[0] for r in rows}
