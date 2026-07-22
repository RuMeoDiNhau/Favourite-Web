// React Context for the per-user bookmark id set.
//
// Why a context (and not Redux, not prop-drilling):
//   - The set is small (<=200 per user, MVP cap) and write-rare
//     (only toggles).
//   - The consumers are spread across App.jsx (Bookmarks view),
//     Knowledge page (🔖 on cards/modal), Feed page (🔖 on posts).
//     Prop-drilling means we'd have to thread currentBookmarks +
//     onToggleBookmark through every layer.
//   - A context keeps the per-render cost trivial: the value object
//     is rebuilt only on toggle, not on every page load.
//
// What lives here:
//   - idMap: Map<'contentType:contentId', true> — O(1) "is this
//     bookmarked?" lookup. Stored as a single composite key so we
//     don't need a nested Map.
//   - isBookmarked(contentType, contentId): boolean.
//   - toggle(contentType, contentId): optimistic update + rollback
//     on API failure. Returns the new state.
//   - refresh(): re-fetch from the BE (used on mount, after user
//     login, after the Bookmarks page itself adds an entry).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../services/api';

const BookmarksContext = createContext(null);

const keyOf = (contentType, contentId) => `${contentType}:${contentId}`;

export function BookmarksProvider({ children }) {
  const [idMap, setIdMap] = useState(() => new Map());
  const [loading, setLoading] = useState(false);

  // Pull the id set once on mount. The provider sits inside the auth
  // gate (App.jsx renders it only after /auth/me confirms a session),
  // so we don't need to handle the unauthenticated case here.
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.fetchBookmarkIds();
      const next = new Map();
      for (const it of items) next.set(keyOf(it.content_type, it.content_id), true);
      setIdMap(next);
    } catch (err) {
      // Silent — bookmarks are not a critical feature. The next
      // toggle() call will surface a real failure if the BE is
      // actually down.
      console.warn('[bookmarks] refresh failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isBookmarked = useCallback(
    (contentType, contentId) => idMap.has(keyOf(contentType, contentId)),
    [idMap]
  );

  // Optimistic toggle: flip the local state immediately, call the
  // API, and reconcile on failure. The BE is the source of truth —
  // if it returns `bookmarked: false` when we locally flipped to
  // true (a race with another tab), we sync back.
  const toggle = useCallback(async (contentType, contentId) => {
    const k = keyOf(contentType, contentId);
    const wasBookmarked = idMap.has(k);
    setIdMap((prev) => {
      const next = new Map(prev);
      if (wasBookmarked) next.delete(k);
      else next.set(k, true);
      return next;
    });
    try {
      const res = await api.toggleBookmark(contentType, contentId);
      if (res?.bookmarked !== !wasBookmarked) {
        // BE disagrees with our optimistic flip — reconcile.
        setIdMap((prev) => {
          const next = new Map(prev);
          if (res?.bookmarked) next.set(k, true);
          else next.delete(k);
          return next;
        });
      }
      return res?.bookmarked ?? !wasBookmarked;
    } catch (err) {
      // Roll back the optimistic flip. The 🔖 icon goes back to
      // its previous state so the user knows the action failed.
      setIdMap((prev) => {
        const next = new Map(prev);
        if (wasBookmarked) next.set(k, true);
        else next.delete(k);
        return next;
      });
      console.warn('[bookmarks] toggle failed', err);
      throw err;
    }
  }, [idMap]);

  const value = useMemo(() => ({
    idMap,
    loading,
    refresh,
    isBookmarked,
    toggle,
  }), [idMap, loading, refresh, isBookmarked, toggle]);

  return (
    <BookmarksContext.Provider value={value}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarksContext);
  if (!ctx) {
    // Allow components outside the provider to still render in a
    // degraded "bookmarks always false" mode rather than crash.
    // The provider sits inside the auth gate, so the FE's first
    // paint already has a session — but a future caller might wrap
    // differently.
    return {
      loading: false,
      refresh: async () => {},
      isBookmarked: () => false,
      toggle: async () => false,
    };
  }
  return ctx;
}