import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './Feed.css';
import { resolveBackendOrigin } from '../../lib/apiBase';
import * as api from '../../services/api';
import CameraBox from '../../components/CameraBox';
import CommentSection from '../../components/Comments/CommentSection';
import { useBookmarks } from '../../lib/BookmarksContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

// Same set as CommentSection — kept inline so the inline summary
// doesn't need a network roundtrip to know which keys to render.
const POST_REACTION_EMOJIS = [
  { key: 'like',  icon: '👍' },
  { key: 'love',  icon: '❤️' },
  { key: 'fire',  icon: '🔥' },
  { key: 'laugh', icon: '😂' },
  { key: 'wow',   icon: '😮' },
];

// Verb mapping for the friends-activity feed. Keys combine
// content_type + event_type so a single lookup covers the
// reasonable (type, action) pairs the BE emits.
const FRIEND_VERB_KEY = {
  'knowledge|view': 'feed.friendAction.viewKnowledge',
  'knowledge|like': 'feed.friendAction.likeKnowledge',
  'music|play':     'feed.friendAction.playMusic',
  'music|like':     'feed.friendAction.likeMusic',
  'game|view':      'feed.friendAction.viewGame',
  'game|like':      'feed.friendAction.likeGame',
  'post|like':      'feed.friendAction.likePost',
  'post|view':      'feed.friendAction.viewPost',
};

const CONTENT_TYPE_ICON = {
  knowledge: '📚',
  music: '🎵',
  game: '🎮',
  post: '📰',
};

export default function Feed({ currentUser, onNavigate }) {
  const { t } = useTranslation();
  const { isBookmarked: isBmPost, toggle: toggleBmPost } = useBookmarks();


  // 1. Loading & error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Data states
  const [posts, setPosts] = useState([]);
  const [articles, setArticles] = useState([]);
  const [games, setGames] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [logsData, setLogsData] = useState([]);
  const [popularSongs, setPopularSongs] = useState([]);
  const [activeTab, setActiveTab] = useState('checkin');
  // Tier 3 N: latest activity events from users the current viewer
  // follows. Lazily loaded with the rest of the feed payload so we
  // don't add a second mount-time round-trip.
  const [friendsActivity, setFriendsActivity] = useState([]);

  // Per-post reactions summary. Loaded lazily as posts scroll into
  // view would be ideal but the FE only renders ~5–10 posts on the
  // dashboard — one fetch per post at load time is fine and avoids
  // a more complex intersection-observer setup.
  const [postReactions, setPostReactions] = useState({});   // {postId: {counts, my_emoji}}
  const [commentModalPost, setCommentModalPost] = useState(null);

  // 3. Category filter for Games Blog
  const [activeGameCategory, setActiveGameCategory] = useState('all');
  const [gameCategories, setGameCategories] = useState([]);

  // 4. Camera/Check-in state
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState(t('dashboard.idle'));
  const [preview, setPreview] = useState(null);
  const [autoScan, setAutoScan] = useState(true);
  const [captureTrigger, setCaptureTrigger] = useState(0);
  const [scanLogs, setScanLogs] = useState(() => [
    { id: 1, text: t('feed.scanLog.ready'), type: 'info' }
  ]);

  // 5. Article & Game Popups / Overlays
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [activeGameUrl, setActiveGameUrl] = useState(null); // Iframe overlay

  // 6. Audio playback states
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioRefs = useRef({});

  // Trigger auto-scan loop
  useEffect(() => {
    if (!autoScan || !isCameraOn) return;
    const interval = setInterval(() => {
      setCaptureTrigger((prev) => prev + 1);
    }, 300000);
    return () => clearInterval(interval);
  }, [autoScan, isCameraOn]);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [activeGameCategory]);

  // Fetch unique categories dynamically from DB on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.fetchGames();
        const allGames = response.data || [];
        const uniqueCats = Array.from(new Set(allGames.map(g => g.category).filter(Boolean)));
        setGameCategories(uniqueCats);
      } catch (err) {
        console.error('Error fetching game categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const processLogsByHour = (logs) => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      success: 0,
      failed: 0
    }));

    logs.forEach(log => {
      if (log.timestamp) {
        try {
          const date = new Date(log.timestamp);
          const hour = date.getHours();
          if (log.status === 'success') {
            hours[hour].success += 1;
          } else {
            hours[hour].failed += 1;
          }
        } catch (e) {
          console.error('Error parsing log timestamp:', e);
        }
      }
    });

    const activeHours = hours.filter(h => h.success > 0 || h.failed > 0);
    if (activeHours.length === 0) {
      return [
        { hour: '08:00', success: 0, failed: 0 },
        { hour: '10:00', success: 0, failed: 0 },
        { hour: '12:00', success: 0, failed: 0 },
        { hour: '14:00', success: 0, failed: 0 },
        { hour: '16:00', success: 0, failed: 0 },
        { hour: '18:00', success: 0, failed: 0 }
      ];
    }
    return activeHours;
  };

  const processPopularSongs = (songsList) => {
    return songsList.slice(0, 5).map(song => ({
      name: song.title.length > 12 ? song.title.substring(0, 12) + '...' : song.title,
      plays: song.plays || 0,
      likes: song.likes || 0
    }));
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Feed posts (Top 3)
      const feedRes = await api.fetchPosts();
      const fetchedPosts = (feedRes.data || []).slice(0, 3);
      setPosts(fetchedPosts);

      // Tier 3 N: latest activity from followed users. Best-effort
      // — the FE renders an empty state if the call fails (e.g.
      // user not logged in, follows nobody). We don't gate the
      // rest of the feed on this single call.
      if (currentUser) {
        try {
          const friends = await api.fetchFriendsActivity(20);
          setFriendsActivity(friends || []);
        } catch (err) {
          setFriendsActivity([]);
        }
      } else {
        setFriendsActivity([]);
      }

      // Reactions per post. Best-effort — a failed fetch on one
      // post shouldn't blank the rest of the feed.
      const reactionPairs = await Promise.all(
        fetchedPosts.map((p) =>
          api.fetchReactions('post', p.id).then((r) => [p.id, r]).catch(() => [p.id, { counts: {}, my_emoji: null }]),
        ),
      );
      setPostReactions(Object.fromEntries(reactionPairs));

      // Fetch Knowledge posts (Top 2)
      const knowledgeRes = await api.fetchAllKnowledge();
      setArticles((knowledgeRes.data || []).slice(0, 2));

      // Fetch Games Blog (Top 2 filtered)
      let gamesRes;
      if (activeGameCategory === 'all') {
        gamesRes = await api.fetchGames();
      } else {
        gamesRes = await api.fetchGamesByCategory(activeGameCategory);
      }
      setGames((gamesRes.data || []).slice(0, 2));

      if (currentUser && currentUser.role === 'admin') {
        try {
          const [usersRes, logsRes, songsRes] = await Promise.all([
            api.fetchUsers(1, 4),
            api.fetchLogs(),
            api.fetchPopularSongs()
          ]);
          setUsersList(usersRes.data.data || usersRes.data || []);
          setLogsData(processLogsByHour(logsRes.data || []));
          setPopularSongs(processPopularSongs(songsRes.data || []));
        } catch (uErr) {
          console.warn('Failed to load real user statistics.', uErr);
          setUsersList([]);
        }
      } else {
        setUsersList([]);
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(t('feed.loadFail'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm(t('feed.confirmDeletePost') || 'Bạn có chắc chắn muốn xóa bài đăng này không?')) {
      return;
    }
    try {
      await api.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Lỗi khi xóa bài đăng:', err);
      alert(api.formatErrorMessage(err.response?.data?.detail, 'Không thể xóa bài đăng.'));
    }
  };

  const handleDeleteKnowledge = async (articleId) => {
    if (!window.confirm(t('feed.confirmDeleteKnowledge') || 'Bạn có chắc chắn muốn xóa bài viết kiến thức này không?')) {
      return;
    }
    try {
      await api.deleteKnowledge(articleId);
      setArticles(prev => prev.filter(a => a.id !== articleId));
    } catch (err) {
      console.error('Lỗi khi xóa bài viết kiến thức:', err);
      alert(api.formatErrorMessage(err.response?.data?.detail, 'Không thể xóa bài viết.'));
    }
  };



  // Face scanning capture callback
  const handleCapture = async (file) => {
    setPreview(URL.createObjectURL(file));
    setStatus('loading');
    setMessage(t('dashboard.processing'));

    // Add scanning indicator to logs
    setScanLogs(prev => [
      { id: Date.now(), text: t('feed.scanLog.scanning'), type: 'scanning' },
      ...prev.slice(0, 2)
    ]);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageBase64 = reader.result;
      try {
        const response = await api.recognizeFace(imageBase64);
        const data = response.data;
        setStatus('success');
        setMessage(`${data.message} - ${data.data.name}`);

        // Add success to logs
        setScanLogs(prev => [
          { id: Date.now(), text: t('feed.scanLog.success', { name: data.data.name }), type: 'success' },
          ...prev.slice(0, 2)
        ]);
      } catch (error) {
        setStatus('error');
        setMessage(t('feed.notRecognized'));

        // Add error to logs
        setScanLogs(prev => [
          { id: Date.now(), text: t('feed.scanLog.error'), type: 'error' },
          ...prev.slice(0, 2)
        ]);
      }
    };
    reader.readAsDataURL(file);
  };

  const getFullAssetUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = resolveBackendOrigin(import.meta.env.VITE_API_URL);
    return `${base}${url}`;
  };

  const handleAudioPlayPause = (postId) => {
    const currentAudio = audioRefs.current[postId];
    if (!currentAudio) return;

    if (playingAudioId === postId) {
      currentAudio.pause();
      setPlayingAudioId(null);
    } else {
      if (playingAudioId && audioRefs.current[playingAudioId]) {
        audioRefs.current[playingAudioId].pause();
      }
      currentAudio.play()
        .then(() => setPlayingAudioId(postId))
        .catch((err) => {
          // play() can reject due to autoplay policy, 404, CORS, or unsupported
          // format. Keep the UI in the paused state so the button label matches
          // reality; the user can retry or pick another post.
          console.warn('Audio play() rejected; keeping UI paused', err);
        });
    }
  };

  const handleLikeKnowledge = async (articleId) => {
    try {
      await api.likeArticle(articleId);
      loadDashboardData();
    } catch (err) {
      console.error('Error liking article:', err);
    }
  };

  const handleLikeGame = async (gameId) => {
    try {
      await api.likeGame(gameId);
      loadDashboardData();
    } catch (err) {
      console.error('Error liking game:', err);
    }
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Helper: resolve the localized verb for a friend-activity row. If
  // we don't have a mapping for the (content_type, event_type) pair,
  // fall back to the raw event_type so we never render empty space.
  const verbForEvent = (ev) => {
    const key = FRIEND_VERB_KEY[`${ev.content_type}|${ev.event_type}`];
    return key ? t(key) : ev.event_type;
  };

  return (
    <div className="dashboard-grid">

      {/* ==================== CỘT GIỮA: FEED & KIẾN THỨC ==================== */}
      <div className="dashboard-col center-col">

        {/* BẢNG TIN MỚI NHẤT */}
        <section className="dashboard-card feed-card-section">
          <div className="card-title-header">
            <h3>{t('feed.title')}</h3>
          </div>

          <div className="dashboard-posts-list">
            {posts.length > 0 ? (
              posts.map((post) => (
                <div key={post.id} className="dash-post-item">
                  <div className="post-item-meta">
                    <div className="post-avatar">{post.user_id.substring(0, 2).toUpperCase()}</div>
                    <div className="post-author-time">
                      <span className="post-username">@{post.user_id}</span>
                      <span className="post-time">{formatDate(post.created_at)}</span>
                    </div>
                    <span className={`post-badge-type ${post.post_type}`}>{post.post_type}</span>
                  </div>

                  <div className="post-item-content">
                    <h4 className="post-title">{post.title}</h4>
                    {post.description && <p className="post-desc">{post.description}</p>}

                    {/* Image / Multi-Photo Gallery Preview */}
                    {post.media_url && (post.post_type === 'image' || post.post_type === 'game' || post.media_url.includes('/image/') || post.media_url.match(/\.(jpg|jpeg|png|gif|webp)/i)) && (
                      <div className="dash-media-preview img-type">
                        {post.media_url.includes(',') ? (
                          <div className="post-photo-gallery" style={{ display: 'grid', gridTemplateColumns: post.media_url.split(',').length === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '10px' }}>
                            {post.media_url.split(',').map((imgUrl, i) => (
                              <img
                                key={i}
                                src={getFullAssetUrl(imgUrl.trim())}
                                alt={`${post.title} ${i + 1}`}
                                style={{ borderRadius: '8px', height: '220px', objectFit: 'cover', width: '100%', cursor: 'pointer' }}
                                onClick={() => window.open(getFullAssetUrl(imgUrl.trim()), '_blank')}
                              />
                            ))}
                          </div>
                        ) : (
                          <img src={getFullAssetUrl(post.media_url)} alt={post.title} style={{ borderRadius: '12px', maxHeight: '400px', objectFit: 'cover', width: '100%', marginTop: '10px' }} />
                        )}
                      </div>
                    )}

                    {/* Video Preview */}
                    {post.post_type === 'video' && post.media_url && (
                      <div className="dash-media-preview video-type">
                        <video src={getFullAssetUrl(post.media_url)} controls preload="metadata" playsInline />
                      </div>
                    )}

                    {/* Audio Preview */}
                    {post.post_type === 'audio' && post.media_url && (
                      <div className="dash-media-preview audio-type">
                        <div className="dash-audio-layout">
                          <button className="audio-play-circle" onClick={() => handleAudioPlayPause(post.id)}>
                            {playingAudioId === post.id ? '⏸️' : '▶️'}
                          </button>
                          <span className="audio-filename">{post.title}</span>
                          <audio
                            ref={(el) => (audioRefs.current[post.id] = el)}
                            src={getFullAssetUrl(post.media_url)}
                            onEnded={() => setPlayingAudioId(null)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Game Preview */}
                    {post.post_type === 'game' && (
                      <div className="dash-media-preview game-type">
                        <button className="dash-game-play-btn" onClick={() => setActiveGameUrl({ url: post.media_url, title: post.title })}>
                          <img
                            src="/game-icon.png"
                            alt="Game Icon"
                            style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '3px' }}
                          />
                          {t('feed.playOnline')}: {post.title}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Reactions row + comment trigger. Counts only render
                      for emojis with > 0 reactions, so a quiet post
                      doesn't show five zeroes. */}
                  {(postReactions[post.id]?.counts) && (
                    <div className="post-reactions-row">
                      {POST_REACTION_EMOJIS.map((r) => {
                        const count = postReactions[post.id]?.counts?.[r.key] || 0;
                        if (count === 0) return null;
                        return (
                          <span
                            key={r.key}
                            className={`post-reaction-chip ${postReactions[post.id].my_emoji === r.key ? 'mine' : ''}`}
                          >
                            {r.icon} {count}
                          </span>
                        );
                      })}
                      <button
                        type="button"
                        className="post-comment-btn"
                        onClick={() => setCommentModalPost(post)}
                      >
                        💬 {t('feed.comment')}
                      </button>
                      <button
                        type="button"
                        className={`post-bookmark-btn ${isBmPost('post', post.id) ? 'filled' : ''}`}
                        onClick={() => toggleBmPost('post', post.id)}
                        title={isBmPost('post', post.id) ? t('feed.unsave') : t('feed.savePost')}
                        aria-label={isBmPost('post', post.id) ? t('feed.unsave') : t('feed.savePost')}
                      >
                        {isBmPost('post', post.id) ? '🔖' : t('feed.save')}
                      </button>
                      {(currentUser?.user_id === post.user_id || currentUser?.role === 'admin') && (
                        <button
                          type="button"
                          className="post-delete-btn"
                          onClick={() => handleDeletePost(post.id)}
                          title={t('feed.deletePost') || 'Xóa bài đăng'}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            marginLeft: 'auto'
                          }}
                        >
                          🗑️ {t('feed.delete') || 'Xóa'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="no-data-text">{t('feed.noPosts')}</p>
            )}
          </div>
        </section>

        {/* CHIA SẺ KIẾN THỨC NỔI BẬT */}
        <section className="dashboard-card knowledge-card-section">
          <div className="card-title-header">
            <h3>{t('feed.knowledgeSection')}</h3>
          </div>

          <div className="dashboard-articles-grid">
            {articles.length > 0 ? (
              articles.map((article) => (
                <div key={article.id} className="dash-article-item" onClick={() => setSelectedArticle(article)}>
                  <div className="article-badge-cat">{article.category}</div>
                  <h4>{article.title}</h4>
                  <p className="article-excerpt">{article.description}</p>

                  <div className="article-author-stats">
                    <span className="author-name">👤 {article.author}</span>
                    <div className="stats-group">
                      <span>👁️ {article.views}</span>
                      <span>❤️ {article.likes}</span>
                    </div>
                  </div>

                  <div className="article-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="article-read-btn" onClick={() => setSelectedArticle(article)}>{t('feed.readMore')}</button>
                    <button className="article-like-btn" onClick={() => handleLikeKnowledge(article.id)}>{t('feed.like')}</button>
                    {(currentUser?.user_id === article.author_user_id || currentUser?.role === 'admin') && (
                      <button
                        className="article-like-btn"
                        onClick={() => handleDeleteKnowledge(article.id)}
                        style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                      >
                        🗑️ Xóa
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data-text">{t('feed.noKnowledge')}</p>
            )}
          </div>
        </section>

        {/* Tier 3 N: latest activity from users the current viewer
            follows. Hidden for non-authenticated viewers since the
            BE endpoint requires login. */}
        {currentUser && (
          <section className="dashboard-card feed-card-section">
            <div className="card-title-header">
              <h3>{t('feed.friendsActivity')}</h3>
            </div>
            <div className="dashboard-posts-list">
              {friendsActivity.length > 0 ? (
                friendsActivity.map((ev) => {
                  const verb = verbForEvent(ev);
                  const icon = CONTENT_TYPE_ICON[ev.content_type] || '✨';
                  return (
                    <div key={ev.id} className="dash-post-item friends-activity-item">
                      <div className="post-item-meta">
                        <div
                          className="post-avatar"
                          onClick={() => onNavigate?.('userProfile', { userId: ev.actor_id })}
                          role="button"
                          tabIndex={0}
                        >
                          {(ev.actor_name || ev.actor_id || '?').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="post-author-time">
                          <span
                            className="post-username"
                            onClick={() => onNavigate?.('userProfile', { userId: ev.actor_id })}
                            role="button"
                            tabIndex={0}
                          >
                            @{ev.actor_id}
                          </span>
                          <span className="post-time">{formatDate(ev.created_at)}</span>
                        </div>
                        <span className="post-badge-type">{icon}</span>
                      </div>
                      <div className="post-item-content">
                        <p className="post-desc">
                          <strong>{ev.actor_name || ev.actor_id}</strong> {verb}{' '}
                          <span className="friends-activity-title">{ev.title || `#${ev.content_id}`}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="no-data-text">{t('feed.noFriends')}</p>
              )}
            </div>
          </section>
        )}

      </div>

      {/* ==================== CỘT PHẢI: GAMES & THỐNG KÊ ==================== */}
      <div className="dashboard-col right-col">

        {/* BLOG GAME & TIN TỨC */}
        <section className="dashboard-card games-card-section">
          <div className="card-title-header">
            <h3>{t('feed.gameBlogSection')}</h3>
          </div>

          <div className="games-dashboard-container">
            {/* Category Filter */}
            <div className="games-dash-sidebar">
              <button
                className={activeGameCategory === 'all' ? 'active' : ''}
                onClick={() => setActiveGameCategory('all')}
              >
                {t('feed.allCategory')}
              </button>
              {gameCategories.map(cat => (
                <button
                  key={cat}
                  className={activeGameCategory === cat ? 'active' : ''}
                  onClick={() => setActiveGameCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Game posts list */}
            <div className="games-dash-list">
              {games.length > 0 ? (
                games.map((game) => (
                  <div key={game.id} className="games-dash-item" onClick={() => setSelectedGame(game)}>
                    <div className="game-item-emoji">
                      {game.image_url ? (
                        game.image_url
                      ) : (
                        <img
                          src="/game-icon.png"
                          alt="Game Icon"
                          style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                        />
                      )}
                    </div>
                    <div className="game-item-info">
                      <h4>{game.title}</h4>
                      <p className="game-item-desc">{game.description}</p>
                      <div className="game-item-stats">
                        <span>👁️ {game.views}</span>
                        <span>❤️ {game.likes}</span>
                      </div>
                      <div className="game-item-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-read" onClick={() => setSelectedGame(game)}>📖 {t('feed.read')}</button>
                        <button className="btn-like" onClick={() => handleLikeGame(game.id)}>{t('feed.like')}</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data-text" style={{ padding: '20px' }}>{t('feed.noGames')}</p>
              )}
            </div>
          </div>
        </section>

        {/* THỐNG KÊ NGƯỜI DÙNG (CHỈ DÀNH CHO ADMIN) */}
        {currentUser && currentUser.role === 'admin' && (
          <section className="dashboard-card statistics-card-section">
            <div className="card-title-header">
              <h3>{t('feed.userStatsSection')}</h3>
            </div>

            <div className="stats-dash-container">
              {/* Table */}
              <div className="stats-table-wrapper">
                <table className="stats-mini-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>{t('feed.statName')}</th>
                      <th>{t('feed.statPhotos')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.slice(0, 3).map((u) => (
                      <tr key={u.user_id}>
                        <td className="bold">{u.user_id}</td>
                        <td>{u.name}</td>
                        <td className="center">{u.registered_images}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Dynamic Recharts Column */}
              <div className="stats-chart-column" style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
                {/* Tabs */}
                <div className="chart-tabs-nav">
                  <button
                    type="button"
                    className={`chart-tab-btn ${activeTab === 'checkin' ? 'active' : ''}`}
                    onClick={() => setActiveTab('checkin')}
                  >
                    📊 {t('feed.checkinTab')}
                  </button>
                  <button
                    type="button"
                    className={`chart-tab-btn ${activeTab === 'songs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('songs')}
                  >
                    🎵 {t('feed.statTopSongs')}
                  </button>
                </div>

                {activeTab === 'checkin' ? (
                  <div className="stats-chart-wrapper" style={{ height: '180px', width: '100%', background: 'var(--bg-item)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={logsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis dataKey="hour" stroke="#94a3b8" fontSize={9} />
                        <YAxis stroke="#94a3b8" fontSize={9} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: '11px' }} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                        <Area type="monotone" dataKey="success" name={t('feed.legend.success')} stroke="#10b981" fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={2} />
                        <Area type="monotone" dataKey="failed" name={t('feed.legend.failed')} stroke="#ef4444" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="stats-chart-wrapper" style={{ height: '180px', width: '100%', background: 'var(--bg-item)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={popularSongs} layout="vertical" margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={9} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={70} />
                        <Tooltip contentStyle={{ fontSize: '11px' }} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                        <Bar dataKey="plays" name={t('feed.legend.plays')} fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={10} />
                        <Bar dataKey="likes" name={t('feed.legend.likes')} fill="#ec4899" radius={[0, 4, 4, 0]} barSize={10} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

      </div>

      {/* ==================== OVERLAYS & MODALS ==================== */}

      {/* Game Iframe Play Modal */}
      {activeGameUrl && (
        <div className="game-overlay-modal" onClick={() => setActiveGameUrl(null)}>
          <div className="game-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="game-modal-header">
              <h2>
                <img
                  src="/game-icon.png"
                  alt="Game"
                  style={{ width: '22px', height: '22px', display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', borderRadius: '4px' }}
                />
                {activeGameUrl.title}
              </h2>
              <button className="close-game-btn" onClick={() => setActiveGameUrl(null)}>✕ {t('feed.modalClose')}</button>
            </div>
            <div className="game-modal-body">
              {(() => {
                const fullUrl = getFullAssetUrl(activeGameUrl.url);
                const apiBase = resolveBackendOrigin(import.meta.env.VITE_API_URL);
                let isTrusted = false;
                try {
                  isTrusted = new URL(fullUrl).origin === new URL(apiBase).origin;
                } catch {
                  isTrusted = false;
                }
                if (!isTrusted) {
                  return (
                    <div className="feed-error-text">
                      ⚠️ {t('feed.untrustedGame')}: {fullUrl}
                      {/* Cookie migration done: the JWT now lives in an
                          httpOnly cookie the iframe can't read, so this
                          URL guard is the only remaining defense for
                          cross-origin game embeds. */}
                    </div>
                  );
                }
                return (
                  <iframe
                    src={fullUrl}
                    title={activeGameUrl.title}
                    allowFullScreen
                    scrolling="no"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    referrerPolicy="no-referrer"
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Article Modal — includes comments + reactions
           so the Feed and the dedicated Knowledge page share the
           same engagement surface. */}
      {selectedArticle && (
        <div className="modal-overlay" onClick={() => setSelectedArticle(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedArticle(null)}>&times;</button>
            <div className="modal-header-detail">
              <h2>{selectedArticle.title}</h2>
              <div className="modal-meta">
                <span>📁 {t('feed.modalCategory')}: <strong>{selectedArticle.category}</strong></span>
                <span>👤 {t('feed.modalAuthor')}: <strong>{selectedArticle.author}</strong></span>
                <span>👁️ {selectedArticle.views} {t('feed.viewsLabel')}</span>
                <span>❤️ {selectedArticle.likes} {t('feed.likesLabel')}</span>
              </div>
            </div>
            <div className="modal-body">
              <p style={{ whiteSpace: 'pre-line' }}>{selectedArticle.content || selectedArticle.description}</p>
              <CommentSection
                contentType="knowledge"
                contentId={selectedArticle.id}
                currentUser={currentUser}
                onNavigate={onNavigate}
              />
            </div>
            <div className="modal-footer">
              <button
                onClick={() => {
                  handleLikeKnowledge(selectedArticle.id);
                  setSelectedArticle(prev => ({ ...prev, likes: prev.likes + 1 }));
                }}
                className="action-btn feed-action-btn-danger"
              >
                ❤️ {t('feed.modalLikeArticle')}
              </button>
              <button onClick={() => setSelectedArticle(null)} className="action-btn" style={{ maxWidth: '100px' }}>
                {t('feed.modalClose')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post detail modal — opens when user clicks "Bình luận" on a
           feed post. Renders the post content inline plus the same
           CommentSection component the article modal uses. */}
      {commentModalPost && (
        <div className="modal-overlay" onClick={() => setCommentModalPost(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setCommentModalPost(null)}>&times;</button>
            <div className="modal-header-detail">
              <h2>{commentModalPost.title}</h2>
              <div className="modal-meta">
                <span>👤 {t('feed.modalAuthor')}: <strong>@{commentModalPost.user_id}</strong></span>
                <span>📁 {t('feed.modalType')}: <strong>{commentModalPost.post_type}</strong></span>
              </div>
            </div>
            <div className="modal-body">
              {commentModalPost.description && (
                <p style={{ whiteSpace: 'pre-line' }}>{commentModalPost.description}</p>
              )}
              <CommentSection
                contentType="post"
                contentId={commentModalPost.id}
                currentUser={currentUser}
                onNavigate={onNavigate}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setCommentModalPost(null)} className="action-btn" style={{ maxWidth: '100px' }}>
                {t('feed.modalClose')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Blog Modal */}
      {selectedGame && (
        <div className="modal-overlay" onClick={() => setSelectedGame(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedGame(null)}>&times;</button>
            <div className="modal-header-detail">
              <h2>{selectedGame.title}</h2>
              <div className="modal-meta">
                <span>📁 {t('feed.modalCategory')}: <strong>{selectedGame.category}</strong></span>
                <span>👁️ {selectedGame.views + 1} {t('feed.viewsLabel')}</span>
                <span>❤️ {selectedGame.likes} {t('feed.likesLabel')}</span>
              </div>
            </div>
            <div className="modal-body">
              <p style={{ whiteSpace: 'pre-line' }}>{selectedGame.content || selectedGame.description}</p>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => {
                  handleLikeGame(selectedGame.id);
                  setSelectedGame(prev => ({ ...prev, likes: prev.likes + 1 }));
                }}
                className="action-btn feed-action-btn-danger"
              >
                ❤️ {t('feed.modalLikeArticle')}
              </button>
              <button onClick={() => setSelectedGame(null)} className="action-btn" style={{ maxWidth: '100px' }}>
                {t('feed.modalClose')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}