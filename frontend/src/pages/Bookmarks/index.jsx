import React, { useCallback, useEffect, useState } from 'react';
import * as api from '../../services/api';
import { useBookmarks } from '../../lib/BookmarksContext';
import { useTranslation } from 'react-i18next';
import './Bookmarks.css';

// Snippet cap matches the BE's list_bookmarks (it truncates to 120
// already); we render the string straight from the API.
function snippet(s, max = 120) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// Per-type label keys for the card type chip. The same lookup table
// is used for the empty-state icon below.
const TYPE_LABEL_KEY = {
  knowledge: 'bookmarks.knowledge',
  post: 'bookmarks.post',
  music: 'bookmarks.music',
  game: 'bookmarks.game',
};

const TYPE_ICON = {
  knowledge: '📚',
  post: '📰',
  music: '🎵',
  game: '🎮',
};

export default function Bookmarks({ onNavigate }) {
  const { t } = useTranslation();
  const { isBookmarked, toggle } = useBookmarks();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // 'all' | 'knowledge' | 'post' | 'music' | 'game' — controls which
  // rows are shown. The BE list is unfiltered when content_type is
  // null; for the FE-side tab filter we just slice client-side
  // (the per-tab dataset is small, <200 items by the cap).
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchBookmarks(null, 200);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[Bookmarks] load failed', err);
      setError(err.response?.data?.detail || t('bookmarks.err.load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleOpen = (item) => {
    if (item.content_type === 'knowledge') {
      // Mirror App.jsx's search-deeplink flow: stash the id, switch
      // views, the Knowledge page consumes it.
      window.dispatchEvent(new CustomEvent('bookmarks-open', { detail: item }));
      onNavigate?.('knowledge');
    } else if (item.content_type === 'post') {
      window.dispatchEvent(new CustomEvent('bookmarks-open', { detail: item }));
      onNavigate?.('feed');
    } else if (item.content_type === 'music') {
      onNavigate?.('music');
    } else if (item.content_type === 'game') {
      onNavigate?.('games');
    }
  };

  const handleUnsave = async (item, e) => {
    e.stopPropagation();
    try {
      await toggle(item.content_type, item.content_id);
      // Optimistic local removal — the context already updated the
      // idMap, but this list is its own state, so we slice it.
      setItems((prev) => prev.filter((i) => !(i.content_type === item.content_type && i.content_id === item.content_id)));
    } catch (err) {
      console.warn('[Bookmarks] unsave failed', err);
    }
  };

  const visible = filter === 'all' ? items : items.filter((i) => i.content_type === filter);
  const counts = {
    all: items.length,
    knowledge: items.filter((i) => i.content_type === 'knowledge').length,
    post: items.filter((i) => i.content_type === 'post').length,
    music: items.filter((i) => i.content_type === 'music').length,
    game: items.filter((i) => i.content_type === 'game').length,
  };

  return (
    <div className="bookmarks-container">
      <header className="bookmarks-header">
        <h1>{t('bookmarks.title')}</h1>
        <p className="bookmarks-subtitle">{t('bookmarks.subtitle')}</p>
      </header>

      <div className="bookmarks-filters">
        <button className={`bookmarks-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          {t('bookmarks.all')} ({counts.all})
        </button>
        <button className={`bookmarks-filter ${filter === 'knowledge' ? 'active' : ''}`} onClick={() => setFilter('knowledge')}>
          📚 {t('bookmarks.knowledge')} ({counts.knowledge})
        </button>
        <button className={`bookmarks-filter ${filter === 'post' ? 'active' : ''}`} onClick={() => setFilter('post')}>
          📰 {t('bookmarks.post')} ({counts.post})
        </button>
        <button className={`bookmarks-filter ${filter === 'music' ? 'active' : ''}`} onClick={() => setFilter('music')}>
          🎵 {t('bookmarks.music')} ({counts.music})
        </button>
        <button className={`bookmarks-filter ${filter === 'game' ? 'active' : ''}`} onClick={() => setFilter('game')}>
          🎮 {t('bookmarks.game')} ({counts.game})
        </button>
      </div>

      {loading && (
        <div className="bookmarks-status">{t('bookmarks.loading')}</div>
      )}

      {error && !loading && (
        <div className="bookmarks-status bookmarks-error">{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bookmarks-empty">
          <div className="bookmarks-empty-icon">🔖</div>
          <h3>{t('bookmarks.empty')}</h3>
          <p>{t('bookmarks.emptyHint')}</p>
          <button className="bookmarks-empty-cta" onClick={() => onNavigate?.('feed')}>
            {t('bookmarks.cta')}
          </button>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <ul className="bookmarks-grid">
          {visible.map((item) => {
            const key = `${item.content_type}-${item.content_id}`;
            const filled = isBookmarked(item.content_type, item.content_id);
            const typeLabel = TYPE_LABEL_KEY[item.content_type] ? t(TYPE_LABEL_KEY[item.content_type]) : item.content_type;
            return (
              <li
                key={key}
                className="bookmarks-card"
                onClick={() => handleOpen(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleOpen(item); }}
              >
                <div className="bookmarks-card-thumb">
                  {item.thumbnail || item.image_url ? (
                    <img src={item.thumbnail || item.image_url} alt="" />
                  ) : (
                    <div className="bookmarks-thumb-placeholder">
                      {TYPE_ICON[item.content_type] || '•'}
                    </div>
                  )}
                </div>
                <div className="bookmarks-card-body">
                  <div className="bookmarks-card-meta">
                    <span className="bookmarks-card-type">
                      {TYPE_ICON[item.content_type] || ' '} {typeLabel}
                    </span>
                    {item.category && <span className="bookmarks-card-cat">{item.category}</span>}
                    {item.artist && <span className="bookmarks-card-cat">{item.artist}</span>}
                  </div>
                  <h3 className="bookmarks-card-title">{item.title}</h3>
                  {item.snippet && <p className="bookmarks-card-snippet">{snippet(item.snippet)}</p>}
                  <div className="bookmarks-card-footer">
                    <span className="bookmarks-card-time">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <button
                      className={`bookmarks-unsave ${filled ? 'filled' : ''}`}
                      onClick={(e) => handleUnsave(item, e)}
                      title={filled ? t('bookmarks.unsave') : t('bookmarks.save')}
                      aria-label={filled ? t('bookmarks.unsave') : t('bookmarks.save')}
                      type="button"
                    >
                      {filled ? '🔖' : '⚪'}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}