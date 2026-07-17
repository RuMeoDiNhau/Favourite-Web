import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import './UserProfile.css';

// Public-facing profile page. Reached by clicking a username in a
// comment thread (or by typing /users/<userId>). Shows the user's
// display fields and a small stats block — articles authored, posts
// authored, comments written, and total likes received on their
// knowledge articles. Stats come from GET /users/{userId}/profile.
export default function UserProfile({ userId, currentUser, onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.fetchUserProfile(userId);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) {
          const status = err?.response?.status;
          setError(status === 404 ? 'Người dùng không tồn tại.' : 'Không tải được hồ sơ.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return <div className="userprofile-container"><div className="userprofile-status">Đang tải hồ sơ...</div></div>;
  }

  if (error) {
    return (
      <div className="userprofile-container">
        <div className="userprofile-status userprofile-error">{error}</div>
        <button className="userprofile-back" onClick={() => onNavigate?.('feed')}>← Về Bảng tin</button>
      </div>
    );
  }

  if (!profile) return null;

  const stats = profile.stats || {};
  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('vi-VN')
    : null;
  // Cosmetic: render the avatar as a colored initial if the user
  // never registered face images (and so avatar_url is null).
  const initials = (profile.name || profile.user_id || '?')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="userprofile-container">
      <button className="userprofile-back" onClick={() => onNavigate?.('feed')}>← Quay lại</button>

      <div className="userprofile-card">
        <div className="userprofile-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.name} />
          ) : (
            <div className="userprofile-avatar-fallback">{initials}</div>
          )}
        </div>
        <div className="userprofile-info">
          <h1 className="userprofile-name">{profile.name || profile.user_id}</h1>
          <div className="userprofile-meta">
            <span>@{profile.user_id}</span>
            {profile.role === 'admin' && <span className="userprofile-badge">Admin</span>}
            {profile.department && <span>🏢 {profile.department}</span>}
            {joinDate && <span>📅 Tham gia {joinDate}</span>}
          </div>
        </div>
      </div>

      <div className="userprofile-stats">
        <div className="userprofile-stat">
          <div className="userprofile-stat-value">{stats.articles_owned || 0}</div>
          <div className="userprofile-stat-label">Bài viết đã đăng</div>
        </div>
        <div className="userprofile-stat">
          <div className="userprofile-stat-value">{stats.total_likes || 0}</div>
          <div className="userprofile-stat-label">Lượt thích nhận</div>
        </div>
        <div className="userprofile-stat">
          <div className="userprofile-stat-value">{stats.posts_authored || 0}</div>
          <div className="userprofile-stat-label">Bài đăng Feed</div>
        </div>
        <div className="userprofile-stat">
          <div className="userprofile-stat-value">{stats.comments_written || 0}</div>
          <div className="userprofile-stat-label">Bình luận</div>
        </div>
      </div>

      {currentUser && currentUser.user_id === profile.user_id && (
        <div className="userprofile-self-hint">Đây là hồ sơ của bạn.</div>
      )}
    </div>
  );
}
