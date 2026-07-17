import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import './Collections.css';

// User-facing list of reading-list collections. Each row is a card
// with name + description + item count + last-update date. "Tạo bộ
// sưu tập mới" opens an inline form at the top — keeps the surface
// to a single page rather than a separate modal route.
//
// Navigation: clicking a row navigates to the collection detail
// view (handled by App.jsx via setView('collectionDetail', { id })).
export default function Collections({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // `creating` flips the inline form open. `name`/`description` are
  // bound to the form fields; we keep them in the parent so the form
  // state survives across list refreshes (e.g. after a failed submit).
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchMyCollections();
      setItems(data || []);
    } catch (err) {
      setError('Không thể tải danh sách bộ sưu tập.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const c = await api.createCollectionApi({ name: name.trim(), description: description.trim() || null });
      setName('');
      setDescription('');
      setCreating(false);
      // Optimistic prepend — saves a list round-trip on success.
      setItems((prev) => [{ ...c, item_count: 0 }, ...prev]);
    } catch (err) {
      // Silent failure with inline hint — the form stays open so the
      // user can fix the name without retyping.
      setError('Không thể tạo. Tên tối đa 255 ký tự và không được rỗng.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Xóa bộ sưu tập này?')) return;
    try {
      await api.deleteCollectionApi(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      // Re-render will silently re-sync if the BE still has the row.
    }
  };

  return (
    <div className="collections-container">
      <header className="collections-header">
        <h1>📂 Bộ sưu tập của tôi</h1>
        <p className="collections-subtitle">Gom các bài viết Knowledge vào nhóm để đọc lại sau.</p>
      </header>

      {!creating ? (
        <button className="collections-create-btn" onClick={() => setCreating(true)}>
          + Tạo bộ sưu tập mới
        </button>
      ) : (
        <form className="collections-create-form" onSubmit={handleCreate}>
          <input
            className="collections-input"
            placeholder="Tên bộ sưu tập (bắt buộc)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={255}
          />
          <textarea
            className="collections-textarea"
            placeholder="Mô tả (tuỳ chọn)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1024}
          />
          <div className="collections-create-actions">
            <button type="submit" className="collections-submit" disabled={submitting || !name.trim()}>
              {submitting ? 'Đang tạo...' : 'Tạo'}
            </button>
            <button type="button" className="collections-cancel" onClick={() => { setCreating(false); setName(''); setDescription(''); }}>
              Huỷ
            </button>
          </div>
        </form>
      )}

      {loading && <div className="collections-status">Đang tải...</div>}
      {error && !loading && <div className="collections-status collections-error">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="collections-empty">
          <div className="collections-empty-icon">📂</div>
          <h3>Bạn chưa có bộ sưu tập nào</h3>
          <p>Tạo bộ sưu tập đầu tiên rồi mở bài viết Knowledge → nhấn "📂 Thêm vào bộ sưu tập".</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <ul className="collections-grid">
          {items.map((c) => (
            <li
              key={c.id}
              className="collections-card"
              onClick={() => onNavigate?.('collectionDetail', { id: c.id })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onNavigate?.('collectionDetail', { id: c.id }); }}
            >
              <div className="collections-card-name">{c.name}</div>
              {c.description && <div className="collections-card-desc">{c.description}</div>}
              <div className="collections-card-footer">
                <span className="collections-card-count">
                  📄 {c.item_count || 0} bài viết
                </span>
                <button
                  className="collections-card-delete"
                  onClick={(e) => handleDelete(c.id, e)}
                  title="Xóa bộ sưu tập"
                  type="button"
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
