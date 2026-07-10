import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as api from '../../services/api';
import './Comments.css';

// The 5 reaction emojis the user can pick from. The set here must
// match backend `comments_service.ALLOWED_EMOJIS` — the BE will
// 400 on anything else, but matching client-side lets us render
// the bar without waiting for a roundtrip.
const REACTION_EMOJIS = [
  { key: 'like',  icon: '👍', label: 'Thích' },
  { key: 'love',  icon: '❤️', label: 'Yêu thích' },
  { key: 'fire',  icon: '🔥', label: 'Tuyệt vời' },
  { key: 'laugh', icon: '😂', label: 'Haha' },
  { key: 'wow',   icon: '😮', label: 'Wow' },
];

const MAX_BODY = 2000;

export default function CommentSection({ contentType, contentId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState({ counts: {}, my_emoji: null });
  const [newBody, setNewBody] = useState('');
  const [replyTo, setReplyTo] = useState(null);   // {id, name} or null
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Optimistic-update bookkeeping. A pending temp id maps to the
  // (parent_id, body) we POSTed so the user sees their comment
  // appear immediately while the BE confirms it.
  const pendingRef = useRef(new Map());

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        api.fetchComments(contentType, contentId),
        api.fetchReactions(contentType, contentId),
      ]);
      setComments(Array.isArray(c) ? c : []);
      setReactions(r || { counts: {}, my_emoji: null });
      setError(null);
    } catch (err) {
      console.warn('[CommentSection] load failed', err);
      setError('Không tải được bình luận');
    } finally {
      setLoading(false);
    }
  }, [contentType, contentId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = newBody.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    setError(null);

    // Optimistic insert — give it a temp id so the React list can
    // render. Replace with the server response on success.
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      user_id: currentUser?.user_id,
      user_name: currentUser?.name,
      user_avatar_url: currentUser?.avatar_url || null,
      body,
      parent_id: replyTo?.id || null,
      created_at: new Date().toISOString(),
      replies: [],
    };
    pendingRef.current.set(tempId, body);

    if (replyTo) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === replyTo.id ? { ...c, replies: [...(c.replies || []), optimistic] } : c,
        ),
      );
    } else {
      setComments((prev) => [...prev, optimistic]);
    }

    try {
      const saved = await api.createComment({
        content_type: contentType,
        content_id: contentId,
        body,
        parent_id: replyTo?.id || null,
      });
      // Swap the optimistic node for the server one.
      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.id
              ? { ...c, replies: (c.replies || []).map((r) => (r.id === tempId ? saved : r)) }
              : c,
          ),
        );
      } else {
        setComments((prev) => prev.map((c) => (c.id === tempId ? saved : c)));
      }
      setNewBody('');
      setReplyTo(null);
    } catch (err) {
      // Roll back the optimistic insert.
      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.id
              ? { ...c, replies: (c.replies || []).filter((r) => r.id !== tempId) }
              : c,
          ),
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== tempId));
      }
      console.warn('[CommentSection] post failed', err);
      setError('Không gửi được bình luận. Vui lòng thử lại.');
    } finally {
      pendingRef.current.delete(tempId);
      setSubmitting(false);
    }
  };

  const handleDelete = async (comment) => {
    if (typeof comment.id !== 'number') {
      // Optimistic row we never managed to replace — just remove it
      // from the UI and bail.
      removeCommentFromTree(comment.id);
      return;
    }
    try {
      await api.deleteCommentApi(comment.id);
      removeCommentFromTree(comment.id);
    } catch (err) {
      console.warn('[CommentSection] delete failed', err);
      setError('Không xóa được bình luận.');
    }
  };

  const removeCommentFromTree = (id) => {
    setComments((prev) => {
      // Try top-level first; if not found, scan replies.
      const top = prev.filter((c) => c.id !== id);
      if (top.length !== prev.length) return top;
      return prev.map((c) => ({
        ...c,
        replies: (c.replies || []).filter((r) => r.id !== id),
      }));
    });
  };

  const handleReaction = async (emoji) => {
    // Optimistic: flip my_emoji and bump the matching count locally.
    // The server response replaces this on the next paint.
    const prev = reactions;
    const nextCounts = { ...prev.counts };
    if (prev.my_emoji === emoji) {
      nextCounts[emoji] = Math.max(0, (nextCounts[emoji] || 0) - 1);
      setReactions({ counts: nextCounts, my_emoji: null });
    } else if (prev.my_emoji) {
      nextCounts[prev.my_emoji] = Math.max(0, (nextCounts[prev.my_emoji] || 0) - 1);
      nextCounts[emoji] = (nextCounts[emoji] || 0) + 1;
      setReactions({ counts: nextCounts, my_emoji: emoji });
    } else {
      nextCounts[emoji] = (nextCounts[emoji] || 0) + 1;
      setReactions({ counts: nextCounts, my_emoji: emoji });
    }
    try {
      const fresh = await api.toggleReaction({
        content_type: contentType,
        content_id: contentId,
        emoji,
      });
      setReactions(fresh);
    } catch (err) {
      console.warn('[CommentSection] reaction failed', err);
      setReactions(prev);
      setError('Không lưu được reaction.');
    }
  };

  const totalComments = comments.reduce(
    (n, c) => n + 1 + (c.replies?.length || 0),
    0,
  );

  return (
    <div className="comment-section">
      <h3 className="comment-section-title">
        💬 Bình luận ({totalComments})
      </h3>

      <div className="reaction-bar">
        {REACTION_EMOJIS.map((r) => {
          const count = reactions.counts?.[r.key] || 0;
          const isMine = reactions.my_emoji === r.key;
          return (
            <button
              key={r.key}
              type="button"
              className={`reaction-btn ${isMine ? 'reaction-btn-active' : ''}`}
              onClick={() => handleReaction(r.key)}
              title={r.label}
              aria-pressed={isMine}
            >
              <span className="reaction-icon">{r.icon}</span>
              <span className="reaction-count">{count}</span>
            </button>
          );
        })}
      </div>

      <form className="comment-form" onSubmit={handleSubmit}>
        {replyTo && (
          <div className="comment-reply-indicator">
            <span>Đang trả lời <strong>@{replyTo.name}</strong></span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="comment-reply-cancel"
              aria-label="Hủy trả lời"
            >
              ✕
            </button>
          </div>
        )}
        <textarea
          className="comment-input"
          placeholder={replyTo ? `Trả lời @${replyTo.name}...` : 'Viết bình luận...'}
          value={newBody}
          onChange={(e) => setNewBody(e.target.value.slice(0, MAX_BODY))}
          rows={3}
          maxLength={MAX_BODY}
        />
        <div className="comment-form-footer">
          <span className="comment-charcount">{newBody.length}/{MAX_BODY}</span>
          <button
            type="submit"
            className="comment-submit"
            disabled={!newBody.trim() || submitting}
          >
            {submitting ? 'Đang gửi...' : replyTo ? 'Trả lời' : 'Gửi'}
          </button>
        </div>
      </form>

      {error && <div className="comment-error">{error}</div>}

      {loading ? (
        <div className="comment-status">Đang tải bình luận...</div>
      ) : comments.length === 0 ? (
        <div className="comment-status">Chưa có bình luận nào. Hãy là người đầu tiên!</div>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <CommentNode
              key={c.id}
              comment={c}
              currentUser={currentUser}
              onReply={(target) => setReplyTo({ id: target.id, name: target.user_name || target.user_id })}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentNode({ comment, currentUser, onReply, onDelete }) {
  const canDelete = currentUser && (currentUser.user_id === comment.user_id || currentUser.role === 'admin');
  const isPending = typeof comment.id === 'string';
  return (
    <li className="comment-item">
      <div className="comment-avatar">
        {comment.user_avatar_url ? (
          <img src={comment.user_avatar_url} alt="" />
        ) : (
          <div className="comment-avatar-fallback">
            {(comment.user_name || comment.user_id || '?').substring(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="comment-body">
        <div className="comment-meta">
          <span className="comment-author">{comment.user_name || comment.user_id}</span>
          <span className="comment-time">{formatRelative(comment.created_at)}</span>
          {isPending && <span className="comment-pending">đang gửi…</span>}
        </div>
        <div className="comment-text">{comment.body}</div>
        <div className="comment-actions">
          <button type="button" className="comment-action-btn" onClick={() => onReply(comment)}>
            ↩ Trả lời
          </button>
          {canDelete && (
            <button type="button" className="comment-action-btn comment-action-delete" onClick={() => onDelete(comment)}>
              🗑 Xóa
            </button>
          )}
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <ul className="comment-replies">
          {comment.replies.map((r) => (
            <CommentNode
              key={r.id}
              comment={r}
              currentUser={currentUser}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// Format a timestamp as "vừa xong / 5 phút trước / 2 giờ trước / 3 ngày trước".
// We bound the output at "X ngày trước" to avoid noise — exact dates
// are available in the API response if a user wants them.
function formatRelative(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
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