// likedSongs.js
// Local-only "favorited song" store. Used by Music page until a backend
// endpoint (`/users/me/liked-songs` or similar) exists.
// Note: likes do not sync across browsers/devices — by design.

const STORAGE_KEY = 'likedSongIds';

function readSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSet(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('[likedSongs] Failed to persist liked song ids', err);
  }
}

export function getLikedSongIds() {
  return readSet();
}

export function isLikedSong(songId) {
  return readSet().has(songId);
}

export function toggleLikedSong(songId) {
  const set = readSet();
  if (set.has(songId)) set.delete(songId);
  else set.add(songId);
  writeSet(set);
  return set.has(songId);
}