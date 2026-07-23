import React, { useEffect, useState } from 'react';
import * as api from '../../services/api';
import { useTranslation } from 'react-i18next';
import T from '../../i18n/T';
import './UserProfile.css';

// Public-facing profile page. Reached by clicking a username in a
// comment thread (or by typing /users/<userId>). Shows the user's
// display fields and a small stats block — articles authored, posts
// authored, comments written, and total likes received on their
// knowledge articles. Stats come from GET /users/{userId}/profile.
//
// Tier 3 J adds the follow graph: the viewer can follow / unfollow
// the target from this page (button only shown for non-self views
// by an authenticated user). Follower + following counts render
// in the header, and tabs at the bottom show the actual lists —
// fetched lazily the first time each tab is opened.
export default function UserProfile({ userId, currentUser, onNavigate }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // `busy` covers the in-flight POST/DELETE on the follow button so
  // we don't double-toggle (the BE is idempotent but the FE should
  // still avoid the round-trip).
  const [followBusy, setFollowBusy] = useState(false);
  // Tab state for the followers / following lists. We default to
  // 'followers' because it's the more common read intent (who follows
  // this person?). Both lists are fetched lazily.
  const [tab, setTab] = useState('followers');
  const [followList, setFollowList] = useState([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.fetchUserProfile(userId);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) {
          const status = err?.response?.status;
          setError(status === 404
            ? t('profile.err.not_found', { defaultValue: 'Người dùng không tồn tại.' })
            : t('profile.err.load', { defaultValue: 'Không thể tải hồ sơ.' }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, t]);

  // Reset the lazy follow-list cache when the profile target changes
  // — otherwise we'd briefly show the previous user's followers.
  useEffect(() => {
    setFollowList([]);
  }, [userId]);

  // Lazy-load the active tab's list. We only refetch when the tab
  // changes (not on every profile render) to avoid hammering the
  // endpoint while the viewer is just scrolling the stats.
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      setFollowListLoading(true);
      try {
        const data = tab === 'followers'
          ? await api.fetchFollowers(userId)
          : await api.fetchFollowing(userId);
        if (!cancelled) setFollowList(data?.[tab] || []);
      } catch (err) {
        if (!cancelled) setFollowList([]);
      } finally {
        if (!cancelled) setFollowListLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile, tab, userId]);

  if (loading) {
    return <div className="userprofile-container"><div className="userprofile-status"><T>Đang tải hồ sơ...</T></div></div>;
  }

  if (error) {
    return (
      <div className="userprofile-container">
        <div className="userprofile-status userprofile-error">{error}</div>
        <button className="userprofile-back" onClick={() => onNavigate?.('feed')}><T>← Về Bảng tin</T></button>
      </div>
    );
  }

  if (!profile) return null;

  const stats = profile.stats || {};
  const follow = profile.follow || { followers: 0, following: 0 };
  const isFollowing = !!profile.is_following;
  // Follow button is only meaningful for an authenticated viewer who
  // isn't viewing their own profile. Anonymous visitors see the stats
  // but no button — they can't follow as a guest.
  const isSelf = currentUser && currentUser.user_id === profile.user_id;
  const canFollow = !!currentUser && !isSelf;
  const joinDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString()
    : null;
  // Cosmetic: render the avatar as a colored initial if the user
  // never registered face images (and so avatar_url is null).
  const initials = (profile.name || profile.user_id || '?')
    .substring(0, 2)
    .toUpperCase();

  // Optimistic toggle: flip local state immediately so the button
  // label updates without waiting for the round-trip, then re-sync
  // from the BE response (which has the authoritative count). On
  // failure we revert to the pre-toggle state.
  const handleToggleFollow = async () => {
    if (!canFollow || followBusy) return;
    const prev = { is_following: isFollowing, followers: follow.followers };
    const optimistic = {
      ...profile,
      is_following: !isFollowing,
      follow: { ...follow, followers: follow.followers + (isFollowing ? -1 : 1) },
    };
    setProfile(optimistic);
    setFollowBusy(true);
    try {
      const res = isFollowing
        ? await api.unfollowUser(profile.user_id)
        : await api.followUser(profile.user_id);
      // BE returns is_following + followers/following counts. Keep the
      // lists themselves untouched — the lazy loader refetches when
      // the user clicks the tab.
      setProfile((p) => p && {
        ...p,
        is_following: res.is_following,
        follow: { followers: res.followers, following: p.follow.following },
      });
    } catch (err) {
      // Revert on failure.
      setProfile((p) => p && {
        ...p,
        is_following: prev.is_following,
        follow: { ...p.follow, followers: prev.followers },
      });
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <div className="userprofile-container">
      <button className="userprofile-back" onClick={() => onNavigate?.('feed')}><T>← Quay lại</T></button>

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
            {joinDate && <span>📅 <T>Tham gia</T> {joinDate}</span>}
          </div>
          <div className="userprofile-follow-row">
            <span className="userprofile-follow-count">
              <strong>{follow.followers}</strong> <T>người theo dõi</T>
            </span>
            <span className="userprofile-follow-dot">·</span>
            <span className="userprofile-follow-count">
              <strong>{follow.following}</strong> <T>đang theo dõi</T>
            </span>
          </div>
        </div>
        {canFollow && (
          <button
            className={`userprofile-follow-btn ${isFollowing ? 'following' : ''}`}
            onClick={handleToggleFollow}
            disabled={followBusy}
          >
            {isFollowing ? <>✓ <T>Đang theo dõi</T></> : <>+ <T>Theo dõi</T></>}
          </button>
        )}
      </div>

      <div className="userprofile-stats">
        <div className="userprofile-stat">
          <div className="userprofile-stat-value">{stats.articles_owned || 0}</div>
          <div className="userprofile-stat-label"><T>Bài viết đã đăng</T></div>
        </div>
        <div className="userprofile-stat">
          <div className="userprofile-stat-value">{stats.total_likes || 0}</div>
          <div className="userprofile-stat-label"><T>Lượt thích nhận</T></div>
        </div>
        <div className="userprofile-stat">
          <div className="userprofile-stat-value">{stats.posts_authored || 0}</div>
          <div className="userprofile-stat-label"><T>Bài đăng Feed</T></div>
        </div>
        <div className="userprofile-stat">
          <div className="userprofile-stat-value">{stats.comments_written || 0}</div>
          <div className="userprofile-stat-label"><T>Bình luận</T></div>
        </div>
      </div>

      <div className="userprofile-network">
        <div className="userprofile-network-tabs">
          <button
            className={`userprofile-network-tab ${tab === 'followers' ? 'active' : ''}`}
            onClick={() => setTab('followers')}
          >
            <T>Người theo dõi</T> ({follow.followers})
          </button>
          <button
            className={`userprofile-network-tab ${tab === 'following' ? 'active' : ''}`}
            onClick={() => setTab('following')}
          >
            <T>Đang theo dõi</T> ({follow.following})
          </button>
        </div>
        <div className="userprofile-network-list">
          {followListLoading ? (
            <div className="userprofile-status"><T>Đang tải...</T></div>
          ) : followList.length === 0 ? (
            <div className="userprofile-status">
              {tab === 'followers' ? <T>Chưa có người theo dõi.</T> : <T>Chưa theo dõi ai.</T>}
            </div>
          ) : (
            <ul>
              {followList.map((u) => (
                <li
                  key={u.user_id}
                  className="userprofile-network-item"
                  onClick={() => onNavigate?.('userProfile', { userId: u.user_id })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') onNavigate?.('userProfile', { userId: u.user_id }); }}
                >
                  <div className="userprofile-network-name">{u.name || u.user_id}</div>
                  <div className="userprofile-network-meta">
                    <span>@{u.user_id}</span>
                    {u.department && <span>· {u.department}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isSelf && (
        <div className="userprofile-self-hint"><T>Đây là hồ sơ của bạn.</T></div>
      )}
    </div>
  );
}
