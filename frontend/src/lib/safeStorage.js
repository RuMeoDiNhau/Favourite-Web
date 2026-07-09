// safeStorage.js
// Read/write JSON values in localStorage with graceful fallback.
// Use this anywhere instead of raw `JSON.parse(localStorage.getItem(...))`
// so a corrupt stored value never crashes the React tree on first render.

export function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn(`[safeStorage] Failed to parse localStorage["${key}"]`, err);
    return null;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[safeStorage] Failed to write localStorage["${key}"]`, err);
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[safeStorage] Failed to remove localStorage["${key}"]`, err);
  }
}