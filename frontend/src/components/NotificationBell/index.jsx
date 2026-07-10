import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as api from '../../services/api';
import './NotificationBell.css';

// Polling cadence for the unread-count badge. 30 s is short enough
// that the user gets fresh notifications without feeling spammy, and
// the request is a single tiny integer so cost is trivial. Pause the
// poll when the tab is hidden so we don't burn cycles in the background.
const POLL_MS = 30000;

// Display cap. Above 9 the badge shows "9+" so the bell doesn't
// stretch on long numbers; this is standard notification UX.
const BADGE_CAP = 9;

// Tab icon for each notification type. Keep this in sync with the
// `ALLOWED_TYPES` set on the BE so a new type never silently renders
// as a question mark.
const TYPE_ICONS = {
  comment_reply: '💬',
  comment_on_post: '💬',
};

export default function NotificationBell({ onSelectItem }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const wrapperRef = useRef(null);

  // Polling — only when the tab is visible. Pausing for hidden tabs
  // is a small kindness to the BE: it cuts the request count for
  // users who keep the app in a background tab.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const c = await api.fetchUnreadCount();
        if (!cancelled) setUnreadCount(c);
      } catch (err) {
        // Network errors are expected when offline; stay quiet
        // rather than spamming console.
      }
    };
    tick();
    const interval = setInterval(tick, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Click-outside closes the dropdown.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchNotifications(unreadOnly, 20);
      setNotifications(data.notifications || []);
      // The list endpoint returns the same unread_count — sync the
      // badge so the dropdown and the bell can never disagree.
      setUnreadCount(data.unread_count ?? 0);
    } catch (err) {
      console.warn('[NotificationBell] fetch list failed', err);
      setError('Không tải được thông báo.');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  // Refresh the list when the dropdown opens or the filter flips.
  // Using the unread-count from the same response keeps the badge
  // honest (a deleted notification might have lowered the count).
  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  const handleClickItem = async (n) => {
    // Optimistic: drop the unread count locally before the network
    // roundtrip completes — the user is about to navigate away so
    // we want the UI to react immediately.
    if (!n.read) {
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      try {
        await api.markNotificationRead(n.id);
      } catch (err) {
        // Rollback on failure. Logging only — the dropdown will refresh.
        console.warn('[NotificationBell] mark read failed', err);
        setUnreadCount((c) => c + 1);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
      }
    }
    setOpen(false);
    // Forward navigation to the parent so the right view + modal
    // opens. Same dispatch as SearchBar results.
    onSelectItem?.(n);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    const prev = unreadCount;
    setUnreadCount(0);
    setNotifications((prev2) => prev2.map((x) => (x.read ? x : { ...x, read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch (err) {
      console.warn('[NotificationBell] mark-all failed', err);
      setUnreadCount(prev);
      // Re-fetch the list to restore the read state.
      loadNotifications();
    }
  };

  const badge = unreadCount > 0 ? (unreadCount > BADGE_CAP ? `${BADGE_CAP}+` : String(unreadCount)) : '';

  return (
    <div className="notif-bell" ref={wrapperRef}>
      <button
        className="notif-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Thông báo"
        aria-expanded={open}
      >
        <span className="notif-bell-icon">🔔</span>
        {badge && <span className="notif-bell-badge">{badge}</span>}
      </button>

      {open && (
        <div className="notif-dropdown" role="menu">
          <div className="notif-dropdown-header">
            <span className="notif-dropdown-title">Thông báo</span>
            {unreadCount > 0 && (
              <button
                className="notif-mark-all-btn"
                onClick={handleMarkAllRead}
                type="button"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="notif-tabs">
            <button
              className={`notif-tab ${!unreadOnly ? 'active' : ''}`}
              onClick={() => setUnreadOnly(false)}
              type="button"
            >
              Tất cả
            </button>
            <button
              className={`notif-tab ${unreadOnly ? 'active' : ''}`}
              onClick={() => setUnreadOnly(true)}
              type="button"
            >
              Chưa đọc {unreadCount > 0 && <span className="notif-tab-badge">{unreadCount}</span>}
            </button>
          </div>

          {error && <div className="notif-error">{error}</div>}

          <div className="notif-list">
            {loading ? (
              <div className="notif-status">Đang tải...</div>
            ) : notifications.length === 0 ? (
              <div className="notif-status">
                {unreadOnly ? '🔔 Không có thông báo chưa đọc.' : '🔔 Bạn chưa có thông báo nào.'}
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`notif-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => handleClickItem(n)}
                >
                  <span className="notif-item-icon">{TYPE_ICONS[n.type] || '🔔'}</span>
                  <span className="notif-item-text">
                    <span className="notif-item-message">{n.message}</span>
                    <span className="notif-item-meta">
                      <span className="notif-item-time">{formatRelative(n.created_at)}</span>
                      {!n.read && <span className="notif-item-dot" aria-label="Chưa đọc" />}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Mirror the CommentSection helper: keep the past tense short, hand
// off to locale date for anything older than a month.
function formatRelative(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}