import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as api from '../../services/api';
import {
  getSearchHistory,
  pushSearchQuery,
  clearSearchHistory,
} from '../../lib/searchHistory';
import './SearchBar.css';

// Display order of the result-type groups. Knowledge first because
// it's the most likely match for a typical query, then music (the
// dropdown rows look like articles), then game, then user (admin).
const TYPE_ORDER = ['knowledge', 'music', 'game', 'user'];

const TYPE_LABELS = {
  knowledge: 'Bài viết',
  music: 'Bài hát',
  game: 'Trò chơi',
  user: 'Người dùng',
};

const TYPE_ICONS = {
  knowledge: '📚',
  music: '🎵',
  game: '🎮',
  user: '👤',
};

// Debounce window. 250 ms is long enough to avoid one request per
// keystroke but short enough that the user feels the response is
// "live". Below ~200 ms it starts to feel chatty on a slow network.
const DEBOUNCE_MS = 250;

// Minimum query length to actually hit the API. Matches the BE's
// _MIN_QUERY_LEN so neither side does a useless LIKE on a 1-char
// query.
const MIN_QUERY_LEN = 2;

export default function SearchBar({ onSelectItem, isAdmin = false, userId = null }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(() => getSearchHistory(userId));
  // Track the in-flight request so an older response can't overwrite
  // a newer one (race when typing fast on a slow connection).
  const reqIdRef = useRef(0);
  const wrapperRef = useRef(null);
  // Held in a ref so handleSelect can blur the <input> after the
  // dropdown closes. Without this, the input keeps DOM focus and the
  // :focus-within ring stays lit — and any keystroke the user intended
  // for the page that just opened (e.g. typing into a modal filter,
  // hitting Esc to close a modal) lands in the now-empty search box
  // instead.
  const inputRef = useRef(null);

  // Click-outside closes the dropdown. Use mousedown so a click that
  // starts outside but ends inside (drag-select) doesn't reopen it.
  useEffect(() => {
    const onMouseDown = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // ESC closes the dropdown from any focused element inside.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [open]);

  // Debounced search. Each effect run captures its own reqId; the
  // .then() callback only commits results if its id is still the
  // current one. Cheaper than AbortController and works the same for
  // this use case.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++reqIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const types = isAdmin ? ['knowledge', 'music', 'game', 'user'] : ['knowledge', 'music', 'game'];
        const data = await api.globalSearch(q, types);
        if (id !== reqIdRef.current) return;  // stale
        setResults(data);
      } catch (err) {
        if (id !== reqIdRef.current) return;
        console.warn('[SearchBar] search failed', err);
        setResults({ query: q, results: {} });
      } finally {
        if (id === reqIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, open, isAdmin]);

  // The merged dropdown list. The order is the result groups in
  // TYPE_ORDER, with the items inside each group in the BE's
  // order (popularity DESC for knowledge/game, plays DESC for music).
  const mergedItems = (() => {
    if (!results) return [];
    const out = [];
    for (const t of TYPE_ORDER) {
      const arr = results.results?.[t];
      if (!Array.isArray(arr) || arr.length === 0) continue;
      for (const item of arr) out.push({ type: t, item });
    }
    return out;
  })();

  const totalCount = mergedItems.length;

  // Pick a result and notify the parent. Saves the query to history
  // (only on a real selection, not on a hover/keystroke). Closes
  // the dropdown so the parent can navigate immediately.
  const handleSelect = useCallback((type, item) => {
    pushSearchQuery(userId, query);
    setHistory(getSearchHistory(userId));
    setOpen(false);
    setQuery('');
    setResults(null);
    // Drop DOM focus from the input so the :focus-within ring on the
    // input wrap turns off and any subsequent keystroke lands in the
    // page that just opened (modal / list view) — not the now-empty
    // search box. setQuery('') alone wouldn't do this.
    inputRef.current?.blur();
    onSelectItem?.(item, type);
  }, [query, userId, onSelectItem]);

  // Pressing Enter on a non-empty query: if there's an exact
  // top result, treat Enter as "go to that one". Otherwise just
  // remember the query and let the user keep scrolling.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim().length >= MIN_QUERY_LEN) {
      pushSearchQuery(userId, query);
      setHistory(getSearchHistory(userId));
    }
  };

  return (
    <div className="searchbar" ref={wrapperRef}>
      <div className="searchbar-input-wrap">
        <span className="searchbar-icon" aria-hidden>🔍</span>
        <input
          className="searchbar-input"
          type="text"
          placeholder="Tìm kiếm bài viết, nhạc, game..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          ref={inputRef}
          aria-label="Tìm kiếm"
        />
        {query && (
          <button
            className="searchbar-clear"
            onClick={() => { setQuery(''); setResults(null); }}
            aria-label="Xóa"
            type="button"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="searchbar-dropdown" role="listbox">
          {/* When the input is empty and we have history, show the
              recent queries. We don't show them when the user is
              mid-search — that would be visual noise. */}
          {query.trim().length < MIN_QUERY_LEN && history.length > 0 && (
            <div className="searchbar-section">
              <div className="searchbar-section-header">
                <span>Tìm gần đây</span>
                <button
                  className="searchbar-history-clear"
                  onClick={() => { clearSearchHistory(userId); setHistory([]); }}
                  type="button"
                >
                  Xóa lịch sử
                </button>
              </div>
              {history.slice(0, 5).map((h, i) => (
                <button
                  key={`${h}-${i}`}
                  className="searchbar-row searchbar-row-history"
                  onClick={() => { setQuery(h); }}
                  type="button"
                >
                  <span className="searchbar-row-icon">🕘</span>
                  <span className="searchbar-row-text">{h}</span>
                </button>
              ))}
            </div>
          )}

          {/* Live search results. We split the render into 3 cases:
              1) query too short & no history → empty hint
              2) loading → spinner row
              3) results returned → grouped rows
              4) no results → "no match" row */}
          {query.trim().length >= MIN_QUERY_LEN && (
            <div className="searchbar-section">
              {loading && (
                <div className="searchbar-status">Đang tìm...</div>
              )}
              {!loading && totalCount === 0 && (
                <div className="searchbar-status">
                  Không tìm thấy kết quả cho "{query.trim()}"
                </div>
              )}
              {!loading && totalCount > 0 && (
                <>
                  {TYPE_ORDER.map((t) => {
                    const arr = results.results?.[t];
                    if (!arr || arr.length === 0) return null;
                    return (
                      <div key={t} className="searchbar-group">
                        <div className="searchbar-group-header">
                          {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                        </div>
                        {arr.map((item, idx) => {
                          const key = `${t}-${item.id ?? item.user_id ?? idx}`;
                          const title =
                            item.title || item.name || item.user_id || `#${item.id ?? idx}`;
                          const sub = item.snippet || item.artist || item.department || item.category || '';
                          return (
                            <button
                              key={key}
                              className="searchbar-row"
                              onClick={() => handleSelect(t, item)}
                              type="button"
                            >
                              <span className="searchbar-row-text">
                                <span className="searchbar-row-title">{title}</span>
                                {sub && <span className="searchbar-row-sub">{sub}</span>}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {query.trim().length < MIN_QUERY_LEN && history.length === 0 && (
            <div className="searchbar-status">
              Gõ ít nhất {MIN_QUERY_LEN} ký tự để tìm kiếm.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
