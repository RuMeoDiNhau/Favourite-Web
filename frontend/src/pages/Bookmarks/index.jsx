import React, { useCallback, useEffect, useState } from 'react';
import * as api from '../../services/api';
import { useBookmarks } from '../../lib/BookmarksContext';
import T from '../../i18n/T';
import './Bookmarks.css';

// The dedupe tag in the page title — also matches the navbar label.
// Keeping this in sync is a separate refactor's problem (we have the
// same risk for "Bảng tin", "Knowledge", etc.).
const PAGE_TITLE = '🔖 Đã lưu';

// Snippet cap matches the BE's list_bookmarks (it truncates to 120
// already); we render the string straight from the API.
function snippet(s, max = 120) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export default function Bookmarks({ onNavigate }) {
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
      setError(err.response?.data?.detail || 'Không thể tải danh sách đã lưu.');
    } finally {
      setLoading(false);
    }
  }, []);

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
        <h1><T>{PAGE_TITLE}</T></h1>
        <p className="bookmarks-subtitle"><T>Những bài viết và bài đăng bạn đã lưu để xem lại sau.</T></p>
      </header>

      <div className="bookmarks-filters">
        <button className={`bookmarks-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          <T>Tất cả</T> ({counts.all})
        </button>
        <button className={`bookmarks-filter ${filter === 'knowledge' ? 'active' : ''}`} onClick={() => setFilter('knowledge')}>
          📚 <T>Bài viết</T> ({counts.knowledge})
        </button>
        <button className={`bookmarks-filter ${filter === 'post' ? 'active' : ''}`} onClick={() => setFilter('post')}>
          📰 <T>Bài đăng</T> ({counts.post})
        </button>
        <button className={`bookmarks-filter ${filter === 'music' ? 'active' : ''}`} onClick={() => setFilter('music')}>
          🎵 <T>Bài hát</T> ({counts.music})
        </button>
        <button className={`bookmarks-filter ${filter === 'game' ? 'active' : ''}`} onClick={() => setFilter('game')}>
          🎮 <T>Trò chơi</T> ({counts.game})
        </button>
      </div>

      {loading && (
        <div className="bookmarks-status"><T>Đang tải...</T></div>
      )}

      {error && !loading && (
        <div className="bookmarks-status bookmarks-error">{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bookmarks-empty">
          <div className="bookmarks-empty-icon">🔖</div>
          <h3><T>Bạn chưa lưu nội dung nào</T></h3>
          <p><T>Nhấn 🔖 trên bài viết Knowledge hoặc trên bài đăng trong Bảng tin để lưu lại xem sau.</T></p>
          <button className="bookmarks-empty-cta" onClick={() => onNavigate?.('feed')}>
            <T>Đi tới Bảng tin →</T>
          </button>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <ul className="bookmarks-grid">
          {visible.map((item) => {
            const key = `${item.content_type}-${item.content_id}`;
            const filled = isBookmarked(item.content_type, item.content_id);
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
                      {item.content_type === 'knowledge' ? '📚' :
                       item.content_type === 'post' ? '📰' :
                       item.content_type === 'music' ? '🎵' : '🎮'}
                    </div>
                  )}
                </div>
                <div className="bookmarks-card-body">
                  <div className="bookmarks-card-meta">
                    <span className="bookmarks-card-type">
                      {item.content_type === 'knowledge' ? '📚 ' :
                       item.content_type === 'post' ? '📰 ' :
                       item.content_type === 'music' ? '🎵 ' : '🎮 '}
                      <T>
                        {item.content_type === 'knowledge' ? 'Bài viết' :
                         item.content_type === 'post' ? 'Bài đăng' :
                         item.content_type === 'music' ? 'Bài hát' : 'Trò chơi'}
                      </T>
                    </span>
                    {item.category && <span className="bookmarks-card-cat">{item.category}</span>}
                    {item.artist && <span className="bookmarks-card-cat">{item.artist}</span>}
                  </div>
                  <h3 className="bookmarks-card-title">{item.title}</h3>
                  {item.snippet && <p className="bookmarks-card-snippet">{snippet(item.snippet)}</p>}
                  <div className="bookmarks-card-footer">
                    <span className="bookmarks-card-time">
                      {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    <button
                      className={`bookmarks-unsave ${filled ? 'filled' : ''}`}
                      onClick={(e) => handleUnsave(item, e)}
                      title={filled ? <T>Bỏ lưu</T> : <T>Lưu</T>}
                      aria-label={filled ? <T>Bỏ lưu</T> : <T>Lưu</T>}
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
