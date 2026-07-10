"""Global search service — single endpoint that fans out to multiple
content types and returns a grouped payload. Used by the navbar
SearchBar in the FE for autocomplete-style queries.

The per-type searchers all use SQL `ILIKE` (the same pattern as
knowledge_service.search_articles). No fuzzy matching, no ranking —
good enough for an MVP, and any upgrade (FTS5, trigram) can swap in
behind the same `_search_xxx` signatures without touching the route.
"""
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.services.db_models import Knowledge, Music, Game, User


# Limit per type, in case a wide-open LIKE matches hundreds of rows.
# The FE only renders ~5 in the dropdown, so anything past this is
# waste.
_PER_TYPE_LIMIT = 5

# Snippet truncation. Keep it short — the dropdown row is one line
# of text in the FE, and the rest is meta.
_SNIPPET_MAX = 120

# Minimum query length. Below this we return an empty result set
# without hitting the DB — protects against SELECT LIKE 'a%' on a
# wide table.
_MIN_QUERY_LEN = 2


def _truncate(s: str | None, n: int = _SNIPPET_MAX) -> str | None:
    if not s:
        return None
    if len(s) <= n:
        return s
    return s[: n - 1].rstrip() + '…'


def _search_knowledge(db: Session, q: str, limit: int) -> list[dict]:
    pat = f"%{q}%"
    rows = (
        db.query(Knowledge)
        .filter(or_(Knowledge.title.ilike(pat), Knowledge.description.ilike(pat)))
        .order_by(Knowledge.views.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            'id': r.id,
            'title': r.title,
            'category': r.category,
            'snippet': _truncate(r.description),
        }
        for r in rows
    ]


def _search_music(db: Session, q: str, limit: int) -> list[dict]:
    pat = f"%{q}%"
    rows = (
        db.query(Music)
        .filter(or_(Music.title.ilike(pat), Music.artist.ilike(pat)))
        .order_by(Music.plays.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            'id': r.id,
            'title': r.title,
            'artist': r.artist,
            'snippet': _truncate(f"{r.genre} · {r.duration}"),
        }
        for r in rows
    ]


def _search_games(db: Session, q: str, limit: int) -> list[dict]:
    pat = f"%{q}%"
    rows = (
        db.query(Game)
        .filter(or_(Game.title.ilike(pat), Game.description.ilike(pat)))
        .order_by(Game.views.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            'id': r.id,
            'title': r.title,
            'category': r.category,
            'snippet': _truncate(r.description),
        }
        for r in rows
    ]


def _search_users(db: Session, q: str, limit: int) -> list[dict]:
    pat = f"%{q}%"
    rows = (
        db.query(User)
        .filter(or_(User.name.ilike(pat), User.user_id.ilike(pat), User.email.ilike(pat)))
        .order_by(User.name.asc())
        .limit(limit)
        .all()
    )
    return [
        {
            'user_id': r.user_id,
            'name': r.name,
            'department': r.department,
        }
        for r in rows
    ]


def global_search(
    db: Session,
    query: str,
    types: list[str] | None = None,
    limit_per_type: int = _PER_TYPE_LIMIT,
    is_admin: bool = False,
) -> dict:
    """Fan out to the requested types and return a grouped payload.

    The `types` list is the FE's way to opt in to specific content
    types; default is the 3 user-facing ones (knowledge, music, game).
    `user` is only included when the caller is admin — surfacing
    the user directory to non-admins would be a small info leak.
    """
    if not query or len(query.strip()) < _MIN_QUERY_LEN:
        return {'query': query or '', 'results': {}}

    requested = set(types or ['knowledge', 'music', 'game'])
    # Defensive: only allow the 4 known types no matter what the
    # caller sent. /search is a public-ish endpoint and a malicious
    # client shouldn't be able to poke at arbitrary tables.
    allowed = {'knowledge', 'music', 'game'}
    if is_admin:
        allowed.add('user')
    types_filtered = requested & allowed

    limit = max(1, min(limit_per_type, _PER_TYPE_LIMIT))
    q = query.strip()

    results: dict[str, list] = {}
    if 'knowledge' in types_filtered:
        results['knowledge'] = _search_knowledge(db, q, limit)
    if 'music' in types_filtered:
        results['music'] = _search_music(db, q, limit)
    if 'game' in types_filtered:
        results['game'] = _search_games(db, q, limit)
    if 'user' in types_filtered and is_admin:
        results['user'] = _search_users(db, q, limit)

    return {'query': q, 'results': results}
