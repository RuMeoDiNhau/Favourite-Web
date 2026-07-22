import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import './Collections.css';

// Button + modal combo. Clicking the button opens a picker dialog
// listing the user's collections with toggle indicators. The picker
// uses optimistic UI: tapping a row flips its "added" state
// immediately, then confirms with the BE.
//
// `contentType` is plumbed through even though the MVP only stores
// knowledge items — keeps the wiring future-proof for when posts /
// games get added to collections.
export default function AddToCollectionButton({ contentType, contentId }) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  // Track added (content_type, content_id) pairs locally so the
  // picker can highlight them. The intersection is computed from
  // the collection ids we already see in the picker — we don't
  // need to know *which* collections contain the item unless the
  // BE tells us. For MVP, the BE doesn't expose that, so we just
  // track optimistic adds in this session.
  const [addedIds, setAddedIds] = useState(new Set());
  const [busyIds, setBusyIds] = useState(new Set());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.fetchMyCollections();
        if (!cancelled) setCollections(data || []);
      } catch (err) {
        if (!cancelled) setCollections([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const handleToggle = async (collection) => {
    if (busyIds.has(collection.id)) return;
    const isAdded = addedIds.has(collection.id);
    setBusyIds((prev) => new Set(prev).add(collection.id));
    // Optimistic flip first, then commit.
    setAddedIds((prev) => {
      const next = new Set(prev);
      if (isAdded) next.delete(collection.id);
      else next.add(collection.id);
      return next;
    });
    try {
      if (isAdded) {
        await api.removeItemFromCollection(collection.id, contentType, contentId);
      } else {
        await api.addItemToCollection(collection.id, contentType, contentId);
      }
    } catch (err) {
      // Revert on failure.
      setAddedIds((prev) => {
        const next = new Set(prev);
        if (isAdded) next.add(collection.id);
        else next.delete(collection.id);
        return next;
      });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(collection.id);
        return next;
      });
    }
  };

  return (
    <>
      <button
        className="action-btn"
        onClick={() => setOpen(true)}
        title="Thêm vào bộ sưu tập"
        type="button"
      >
        📂 Thêm vào bộ sưu tập
      </button>
      {open && (
        <div className="collections-picker-overlay" onClick={() => setOpen(false)}>
          <div className="collections-picker" onClick={(e) => e.stopPropagation()}>
            <div className="collections-picker-header">
              <span>Thêm vào bộ sưu tập</span>
              <button className="collections-picker-close" onClick={() => setOpen(false)} type="button">×</button>
            </div>
            <div className="collections-picker-list">
              {loading ? (
                <div className="collections-picker-empty">Đang tải...</div>
              ) : collections.length === 0 ? (
                <div className="collections-picker-empty">Bạn chưa có bộ sưu tập nào. Hãy vào "Bộ sưu tập của tôi" để tạo.</div>
              ) : (
                collections.map((c) => {
                  const isAdded = addedIds.has(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`collections-picker-item ${isAdded ? 'added' : ''}`}
                      onClick={() => handleToggle(c)}
                    >
                      <span>{c.name}</span>
                      <span>{isAdded ? '✓ Đã thêm' : '+ Thêm'}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
