import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as api from '../../services/api';
import { useTranslation } from 'react-i18next';
import T from '../../i18n/T';
import './Comments.css';

// The 5 reaction emojis the user can pick from. The set here must
// match backend `comments_service.ALLOWED_EMOJIS` — the BE will
// 400 on anything else, but matching client-side lets us render
// the bar without waiting for a roundtrip.
const REACTION_LABELS = {
  like: 'Thích',
  love: 'Yêu thích',
  fire: 'Tuyệt vời',
  laugh: 'Haha',
  wow: 'Wow',
};
const REACTION_EMOJIS = [
  { key: 'like',  icon: '👍' },
  { key: 'love',  icon: '❤️' },
  { key: 'fire',  icon: '🔥' },
  { key: 'laugh', icon: '😂' },
  { key: 'wow',   icon: '😮' },
];

const MAX_BODY = 2000;

export default function CommentSection({ contentType, contentId, currentUser, onNavigate }) {
  const { t } = useTranslation();
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
      setError(t('comments.err.load', { defaultValue: 'Không tải được bình luận' }));
    } finally {
      setLoading(false);
    }
  }, [contentType, contentId, t]);

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
      setError(t('comments.err.send', { defaultValue: 'Không gửi được bình luận. Vui lòng thử lại.' }));
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
      setError(t('comments.err.delete', { defaultValue: 'Không xóa được bình luận.' }));
    }
  };

  // Edit a comment in place. We replace the row in the tree with
  // whatever the BE returns (carries a fresh updated_at + the
  // trimmed body). On failure we leave the row alone and surface
  // a banner — the textarea in CommentNode keeps the user's draft
  // so they can retry without retyping.
  const handleUpdate = async (comment, newBody) => {
    const saved = await api.updateComment(comment.id, newBody);
    setComments((prev) => replaceInTree(prev, comment.id, saved));
    return saved;
  };

  // Same traversal as removeCommentFromTree, but for replace.
  function replaceInTree(list, targetId, replacement) {
    let touched = false;
    const next = list.map((c) => {
      if (c.id === targetId) {
        touched = true;
        return { ...replacement, replies: c.replies || [] };
      }
      if (c.replies && c.replies.length) {
        const r = replaceInTree(c.replies, targetId, replacement);
        if (r !== c.replies) touched = true;
        return { ...c, replies: r };
      }
      return c;
    });
    return touched ? next : list;
  }

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

  // Click on a username inside a comment → ask the host page to
  // navigate to the user's profile. We do this via the page's
  // setView (passed as onNavigate) so the URL updates to a real
  // /users/<id> path the user can share / bookmark.
  const onProfileUser = (userId) => {
    if (onNavigate) onNavigate('userProfile', { userId });
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
      setError(t('comments.err.reaction', { defaultValue: 'Không lưu được reaction.' }));
    }
  };

  const totalComments = comments.reduce(
    (n, c) => n + 1 + (c.replies?.length || 0),
    0,
  );

  return (
    <div className="comment-section">
      <h3 className="comment-section-title">
        💬 <T>Bình luận</T> ({totalComments})
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
              title={REACTION_LABELS[r.key]}
              aria-label={REACTION_LABELS[r.key]}
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
            <span><T>Đang trả lời</T> <strong>@{replyTo.name}</strong></span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="comment-reply-cancel"
              aria-label={t('comments.cancel_reply', { defaultValue: 'Hủy trả lời' })}
            >
              ✕
            </button>
          </div>
        )}
        <textarea
          className="comment-input"
          placeholder={replyTo
            ? t('comments.ph.reply', { name: replyTo.name, defaultValue: `Trả lời @${replyTo.name}...` })
            : t('comments.ph.write', { defaultValue: 'Viết bình luận...' })}
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
            {submitting ? <T>Đang gửi...</T> : replyTo ? <T>Trả lời</T> : <T>Gửi</T>}
          </button>
        </div>
      </form>

      {error && <div className="comment-error">{error}</div>}

      {loading ? (
        <div className="comment-status"><T>Đang tải bình luận...</T></div>
      ) : comments.length === 0 ? (
        <div className="comment-status"><T>Chưa có bình luận nào. Hãy là người đầu tiên!</T></div>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <CommentNode
              key={c.id}
              comment={c}
              currentUser={currentUser}
              onReply={(target) => setReplyTo({ id: target.id, name: target.user_name || target.user_id })}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onProfile={onProfileUser}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentNode({ comment, currentUser, onReply, onDelete, onUpdate, onProfile }) {
  const canModify = currentUser && currentUser.user_id === comment.user_id;
  const canDelete = canModify || (currentUser && currentUser.role === 'admin');
  const isPending = typeof comment.id === 'string';
  // Inline edit state — only meaningful for owner comments that the
  // server has confirmed (real numeric id). Toggling 'editing' flips
  // the body cell into a textarea; 'editBody' holds the draft.
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setEditBody(comment.body);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditBody(comment.body);
    setEditing(false);
  };

  const saveEdit = async () => {
    const next = editBody.trim();
    if (!next || next === comment.body) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      await onUpdate(comment, next);
      setEditing(false);
    } catch (err) {
      console.warn('[CommentSection] edit failed', err);
    } finally {
      setSaving(false);
    }
  };

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
          <span
            className="comment-author comment-author-link"
            role="button"
            tabIndex={0}
            onClick={() => onProfile(comment.user_id)}
            onKeyDown={(e) => { if (e.key === 'Enter') onProfile(comment.user_id); }}
          >
            {comment.user_name || comment.user_id}
          </span>
          <span className="comment-time">{formatRelative(comment.created_at)}</span>
          {comment.updated_at && <span className="comment-edited" title={`Edited ${formatRelative(comment.updated_at)}`}>(edited)</span>}
          {isPending && <span className="comment-pending">sending…</span>}
        </div>
        {editing ? (
          <div className="comment-edit">
            <textarea
              className="comment-input"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value.slice(0, MAX_BODY))}
              rows={3}
              maxLength={MAX_BODY}
              autoFocus
            />
            <div className="comment-form-footer">
              <span className="comment-charcount">{editBody.length}/{MAX_BODY}</span>
              <div className="comment-edit-actions">
                <button
                  type="button"
                  className="comment-action-btn"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  <T>Hủy</T>
                </button>
                <button
                  type="button"
                  className="comment-submit comment-submit-inline"
                  onClick={saveEdit}
                  disabled={!editBody.trim() || saving}
                >
                  {saving ? <T>Đang lưu...</T> : <T>Lưu</T>}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="comment-text">{comment.body}</div>
        )}
        <div className="comment-actions">
          <button type="button" className="comment-action-btn" onClick={() => onReply(comment)}>
            ↩ <T>Trả lời</T>
          </button>
          {canModify && !editing && !isPending && (
            <button type="button" className="comment-action-btn" onClick={startEdit}>
              ✏️ <T>Sửa</T>
            </button>
          )}
          {canDelete && !editing && (
            <button type="button" className="comment-action-btn comment-action-delete" onClick={() => onDelete(comment)}>
              🗑 <T>Xóa</T>
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
              onUpdate={onUpdate}
              onProfile={onProfile}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// Format a timestamp as "just now / 5m ago / 2h ago / 3d ago".
// We bound the output at "Xd ago" to avoid noise — exact dates
// are available in the API response if a user wants them.
function formatRelative(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
