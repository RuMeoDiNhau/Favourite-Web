import React, { useState, useEffect, useRef } from 'react';
import './Feed.css';
import * as api from '../../services/api';
import CameraBox from '../../components/CameraBox';
import CommentSection from '../../components/Comments/CommentSection';
import { readJson } from '../../lib/safeStorage';
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

export default function Feed() {
  const user = readJson('user');

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
  const [message, setMessage] = useState('Chưa có kết quả');
  const [preview, setPreview] = useState(null);
  const [autoScan, setAutoScan] = useState(true);
  const [captureTrigger, setCaptureTrigger] = useState(0);
  const [scanLogs, setScanLogs] = useState([
    { id: 1, text: 'Thiết bị sẵn sàng', type: 'info' }
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

      if (user && user.role === 'admin') {
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
      setError('Không thể tải dữ liệu Dashboard. Vui lòng đăng nhập lại.');
    } finally {
      setLoading(false);
    }
  };



  // Face scanning capture callback
  const handleCapture = async (file) => {
    setPreview(URL.createObjectURL(file));
    setStatus('loading');
    setMessage('Đang xử lý ảnh...');
    
    // Add scanning indicator to logs
    setScanLogs(prev => [
      { id: Date.now(), text: '⏳ Đang quét...', type: 'scanning' },
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
          { id: Date.now(), text: `✅ Thành công: ${data.data.name}`, type: 'success' },
          ...prev.slice(0, 2)
        ]);
      } catch (error) {
        setStatus('error');
        setMessage('Không nhận diện được khuôn mặt.');
        
        // Add error to logs
        setScanLogs(prev => [
          { id: Date.now(), text: '❌ Không nhận diện được', type: 'error' },
          ...prev.slice(0, 2)
        ]);
      }
    };
    reader.readAsDataURL(file);
  };

  const getFullAssetUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api/v1', '') 
      : 'http://localhost:8000';
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
      return d.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-grid">

      {/* ==================== CỘT GIỮA: FEED & KIẾN THỨC ==================== */}
      <div className="dashboard-col center-col">
        
        {/* BẢNG TIN MỚI NHẤT */}
        <section className="dashboard-card feed-card-section">
          <div className="card-title-header">
            <h3>Feed Mới Nhất</h3>
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

                    {/* Image Preview */}
                    {post.post_type === 'image' && post.media_url && (
                      <div className="dash-media-preview img-type">
                        <img src={getFullAssetUrl(post.media_url)} alt={post.title} />
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
                          Chơi trực tuyến: {post.title}
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
                        💬 Bình luận
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="no-data-text">Chưa có hoạt động nào được đăng.</p>
            )}
          </div>
        </section>

        {/* CHIA SẺ KIẾN THỨC NỔI BẬT */}
        <section className="dashboard-card knowledge-card-section">
          <div className="card-title-header">
            <h3>Chia Sẻ Kiến Thức Nổi Bật</h3>
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
                    <button className="article-read-btn" onClick={() => setSelectedArticle(article)}>Đọc Thêm →</button>
                    <button className="article-like-btn" onClick={() => handleLikeKnowledge(article.id)}>❤️ Thích</button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data-text">Không có bài viết kiến thức nào.</p>
            )}
          </div>
        </section>

      </div>

      {/* ==================== CỘT PHẢI: GAMES & THỐNG KÊ ==================== */}
      <div className="dashboard-col right-col">
        
        {/* BLOG GAME & TIN TỨC */}
        <section className="dashboard-card games-card-section">
          <div className="card-title-header">
            <h3>Blog Game & Tin Tức</h3>
          </div>

          <div className="games-dashboard-container">
            {/* Category Filter */}
            <div className="games-dash-sidebar">
              <button 
                className={activeGameCategory === 'all' ? 'active' : ''} 
                onClick={() => setActiveGameCategory('all')}
              >
                Tất Cả
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
                        <button className="btn-read" onClick={() => setSelectedGame(game)}>📖 Đọc</button>
                        <button className="btn-like" onClick={() => handleLikeGame(game.id)}>❤️ Thích</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-data-text" style={{ padding: '20px' }}>Không có bài viết game.</p>
              )}
            </div>
          </div>
        </section>

        {/* THỐNG KÊ NGƯỜI DÙNG (CHỈ DÀNH CHO ADMIN) */}
        {user && user.role === 'admin' && (
          <section className="dashboard-card statistics-card-section">
            <div className="card-title-header">
              <h3>Thống Kê Người Dùng</h3>
            </div>

            <div className="stats-dash-container">
              {/* Table */}
              <div className="stats-table-wrapper">
                <table className="stats-mini-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tên</th>
                      <th>Số ảnh</th>
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
                    📊 Check-in
                  </button>
                  <button 
                    type="button"
                    className={`chart-tab-btn ${activeTab === 'songs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('songs')}
                  >
                    🎵 Top 5 Nhạc
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
                        <Area type="monotone" dataKey="success" name="Thành công" stroke="#10b981" fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={2} />
                        <Area type="monotone" dataKey="failed" name="Thất bại" stroke="#ef4444" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2} />
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
                        <Bar dataKey="plays" name="Lượt nghe" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={10} />
                        <Bar dataKey="likes" name="Thích" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={10} />
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
              <button className="close-game-btn" onClick={() => setActiveGameUrl(null)}>✕ Đóng</button>
            </div>
            <div className="game-modal-body">
              {(() => {
                const fullUrl = getFullAssetUrl(activeGameUrl.url);
                const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace('/api/v1', '');
                let isTrusted = false;
                try {
                  isTrusted = new URL(fullUrl).origin === new URL(apiBase).origin;
                } catch {
                  isTrusted = false;
                }
                if (!isTrusted) {
                  return (
                    <div style={{ padding: '24px', color: '#ff6b6b' }}>
                      ⚠️ Không thể mở game từ nguồn không đáng tin cậy: {fullUrl}
                      {/* TODO(security): move JWT from localStorage to httpOnly cookie so
                          the iframe can keep `allow-same-origin` without exposing the
                          token to framed scripts. */}
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
                <span>📁 Chủ đề: <strong>{selectedArticle.category}</strong></span>
                <span>👤 Tác giả: <strong>{selectedArticle.author}</strong></span>
                <span>👁️ {selectedArticle.views} lượt xem</span>
                <span>❤️ {selectedArticle.likes} lượt thích</span>
              </div>
            </div>
            <div className="modal-body">
              <p style={{ whiteSpace: 'pre-line' }}>{selectedArticle.content || selectedArticle.description}</p>
              <CommentSection
                contentType="knowledge"
                contentId={selectedArticle.id}
                currentUser={user}
              />
            </div>
            <div className="modal-footer">
              <button
                onClick={() => {
                  handleLikeKnowledge(selectedArticle.id);
                  setSelectedArticle(prev => ({ ...prev, likes: prev.likes + 1 }));
                }}
                className="action-btn"
                style={{ maxWidth: '120px', background: 'rgba(255, 107, 107, 0.3)', borderColor: '#ff6b6b' }}
              >
                ❤️ Thích bài viết
              </button>
              <button onClick={() => setSelectedArticle(null)} className="action-btn" style={{ maxWidth: '100px' }}>
                Đóng
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
                <span>👤 Tác giả: <strong>@{commentModalPost.user_id}</strong></span>
                <span>📁 Loại: <strong>{commentModalPost.post_type}</strong></span>
              </div>
            </div>
            <div className="modal-body">
              {commentModalPost.description && (
                <p style={{ whiteSpace: 'pre-line' }}>{commentModalPost.description}</p>
              )}
              <CommentSection
                contentType="post"
                contentId={commentModalPost.id}
                currentUser={user}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setCommentModalPost(null)} className="action-btn" style={{ maxWidth: '100px' }}>
                Đóng
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
                <span>📁 Thể loại: <strong>{selectedGame.category}</strong></span>
                <span>👁️ {selectedGame.views + 1} lượt xem</span>
                <span>❤️ {selectedGame.likes} lượt thích</span>
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
                className="action-btn"
                style={{ maxWidth: '120px', background: 'rgba(255, 107, 107, 0.3)', borderColor: '#ff6b6b' }}
              >
                ❤️ Thích bài viết
              </button>
              <button onClick={() => setSelectedGame(null)} className="action-btn" style={{ maxWidth: '100px' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
