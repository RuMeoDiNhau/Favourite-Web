// Client-side only search history. The backend doesn't know about
// this — there is no `/users/me/search-history` endpoint and that's
// intentional for an MVP: search is personal, ephemeral, and not
// worth a backend roundtrip. If we ever want cross-device sync, the
// shape is simple enough to add later without breaking callers
// (read/write/clear all go through this module).
//
// Storage is namespaced per user (`searchHistory:<userId>`). Each
// accessor takes `userId` so that:
//   - User A logs in, types "python" → saved under searchHistory:A.
//   - User A logs out, User B logs in → SearchBar reads
//     searchHistory:B (empty), gets fresh per-user history.
//   - A user with no ID (e.g. mid-logout) reads/writes nothing
//     rather than crashing or leaking.
//
// The previous shared 'searchHistory' key was a privacy bug: User A's
// query list appeared in User B's dropdown when they shared a
// browser. (Two users on one laptop at work, or after a logout-login
// flow that didn't reload the page.) Each accessor also defensively
// handles corrupt JSON — it returns an empty list instead of
// throwing.

const KEY_PREFIX = 'searchHistory:';
const MAX_ENTRIES = 10;

function keyFor(userId) {
  // Fall back to a sentinel rather than throwing so calling code can
  // stay simple (no try/catch around every push).
  return userId ? `${KEY_PREFIX}${userId}` : null;
}

function readRaw(userId) {
  const key = keyFor(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch (err) {
    console.warn('[searchHistory] Failed to read', err);
    return [];
  }
}

function writeRaw(userId, list) {
  const key = keyFor(userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.warn('[searchHistory] Failed to write', err);
  }
}

export function getSearchHistory(userId) {
  return readRaw(userId);
}

/**
 * Push a query to the front of the history list, deduped, capped at
 * MAX_ENTRIES. Empty / whitespace-only queries are ignored — typing
 * a space and pressing Enter shouldn't pollute the history.
 *
 * `userId` is required so the entry is stored under the right
 * namespace. With no userId the call is a no-op (safer than
 * crashing the search bar mid-logout).
 */
export function pushSearchQuery(userId, q) {
  if (!userId) return;
  const trimmed = (q || '').trim();
  if (!trimmed) return;
  const current = readRaw(userId);
  // Remove any existing occurrence of the same query (case-insensitive)
  // so re-searching the same thing moves it to the top instead of
  // duplicating.
  const filtered = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  filtered.unshift(trimmed);
  writeRaw(userId, filtered.slice(0, MAX_ENTRIES));
}

export function clearSearchHistory(userId) {
  const key = keyFor(userId);
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[searchHistory] Failed to clear', err);
  }
}
