// Client-side only search history. The backend doesn't know about
// this — there is no `/users/me/search-history` endpoint and that's
// intentional for an MVP: search is personal, ephemeral, and not
// worth a backend roundtrip. If we ever want cross-device sync, the
// shape is simple enough to add later without breaking callers
// (read/write/clear all go through this module).
//
// Storage key is namespaced (`searchHistory`) so it doesn't collide
// with other app data. All accessors are defensive — corrupt JSON
// returns an empty list instead of throwing.

const STORAGE_KEY = 'searchHistory';
const MAX_ENTRIES = 10;

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch (err) {
    console.warn('[searchHistory] Failed to read', err);
    return [];
  }
}

function writeRaw(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[searchHistory] Failed to write', err);
  }
}

export function getSearchHistory() {
  return readRaw();
}

/**
 * Push a query to the front of the history list, deduped, capped at
 * MAX_ENTRIES. Empty / whitespace-only queries are ignored — typing
 * a space and pressing Enter shouldn't pollute the history.
 */
export function pushSearchQuery(q) {
  const trimmed = (q || '').trim();
  if (!trimmed) return;
  const current = readRaw();
  // Remove any existing occurrence of the same query (case-insensitive)
  // so re-searching the same thing moves it to the top instead of
  // duplicating.
  const filtered = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  filtered.unshift(trimmed);
  writeRaw(filtered.slice(0, MAX_ENTRIES));
}

export function clearSearchHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[searchHistory] Failed to clear', err);
  }
}
