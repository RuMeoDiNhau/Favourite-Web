import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import './Collections.css';

// Renders a single collection by id. Loads the collection via
// GET /collections/{id} which returns the row + items array (each
// item is denormalized with title + category from the join).
//
// Edit mode toggles an inline form for name/description — same UX as
// the list page's create form, intentionally kept symmetric.
export default function CollectionDetail({ collectionId, onNavigate }) {
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.fetchCollectionDetail(collectionId);
        if (!cancelled) setCollection(data);
      } catch (err) {
        if (!cancelled) {
          const status = err?.response?.status;
          setError(status === 404 ? 'Bộ sưu tập không tồn tại.' : 'Không tải được bộ sưu tập.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [collectionId]);

  // Pre-fill the edit form when entering edit mode. We snapshot from
  // `collection` each time so successive edits don't carry stale state.
  const beginEdit = () => {
    setEditName(collection?.name || '');
    setEditDesc(collection?.description || '');
    setEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving || !editName.trim()) return;
    setSaving(true);
    try {
      const updated = await api.updateCollectionApi(collectionId, {
        name: editName.trim(),
        description: editDesc.trim() || null,
      });
      setCollection((c) => c ? { ...c, name: updated.name, description: updated.description } : c);
      setEditing(false);
    } catch (err) {
      // Stay in edit mode on failure so the user can fix the name.
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (item, e) => {
    e.stopPropagation();
    try {
      await api.removeItemFromCollection(collectionId, item.content_type, item.content_id);
      // Optimistic removal — server-side count will re-sync on next load.
      setCollection((c) => c ? {
        ...c,
        items: c.items.filter((i) => i.id !== item.id),
        item_count: Math.max(0, (c.item_count || 1) - 1),
      } : c);
    } catch (err) {
      // Silent — the item is still on the server so re-render fixes it.
    }
  };

  if (loading) {
    return <div className="collections-container"><div className="collections-status">Đang tải...</div></div>;
  }

  if (error) {
    return (
      <div className="collections-container">
        <div className="collections-status collections-error">{error}</div>
        <button className="collections-back" onClick={() => onNavigate?.('collections')}>← Về danh sách</button>
      </div>
    );
  }

  if (!collection) return null;

  return (
    <div className="collections-container">
      <button className="collections-back" onClick={() => onNavigate?.('collections')}>← Về danh sách</button>

      <header className="collections-header">
        {!editing ? (
          <>
            <h1>📂 {collection.name}</h1>
            {collection.description && <p className="collections-subtitle">{collection.description}</p>}
            <div className="collections-detail-actions">
              <button className="collections-edit-btn" onClick={beginEdit}>✏️ Sửa</button>
            </div>
          </>
        ) : (
          <form className="collections-create-form" onSubmit={handleSave}>
            <input
              className="collections-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={255}
              autoFocus
            />
            <textarea
              className="collections-textarea"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              maxLength={1024}
            />
            <div className="collections-create-actions">
              <button type="submit" className="collections-submit" disabled={saving || !editName.trim()}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button type="button" className="collections-cancel" onClick={() => setEditing(false)}>Huỷ</button>
            </div>
          </form>
        )}
      </header>

      {!collection.items || collection.items.length === 0 ? (
        <div className="collections-empty">
          <div className="collections-empty-icon">📄</div>
          <h3>Bộ sưu tập trống</h3>
          <p>Mở bài viết Knowledge → nhấn "📂 Thêm vào bộ sưu tập" → chọn "{collection.name}".</p>
        </div>
      ) : (
        <ul className="collections-grid">
          {collection.items.map((item) => (
            <li
              key={item.id}
              className="collections-card"
              onClick={() => item.content_type === 'knowledge' && onNavigate?.('knowledge')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && item.content_type === 'knowledge') onNavigate?.('knowledge');
              }}
            >
              <div className="collections-card-name">{item.title}</div>
              <div className="collections-card-meta">
                {item.category && <span>📁 {item.category}</span>}
                <span>📚 Bài viết</span>
              </div>
              <div className="collections-card-footer">
                <button
                  className="collections-card-delete"
                  onClick={(e) => handleRemoveItem(item, e)}
                  title="Xoá khỏi bộ sưu tập"
                  type="button"
                >
                  ✕ Bỏ khỏi bộ sưu tập
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
