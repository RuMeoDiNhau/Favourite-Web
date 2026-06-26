import React, { useState, useEffect, useRef } from 'react';
import './Feed.css';
import * as api from '../../services/api';
import CameraBox from '../../components/CameraBox';

export default function Feed() {
  const user = (() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  // 1. Loading & error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Data states
  const [posts, setPosts] = useState([]);
  const [articles, setArticles] = useState([]);
  const [games, setGames] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [isMockUsers, setIsMockUsers] = useState(false);

  // 3. Category filter for Games Blog
  const [activeGameCategory, setActiveGameCategory] = useState('all');

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
    }, 3000);
    return () => clearInterval(interval);
  }, [autoScan, isCameraOn]);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [activeGameCategory]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Feed posts (Top 3)
      const feedRes = await api.fetchPosts();
      setPosts((feedRes.data || []).slice(0, 3));

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

      // Fetch User Stats (Admin only or fallback to mock)
      if (user && user.role === 'admin') {
        try {
          const usersRes = await api.fetchUsers(1, 4);
          setUsersList(usersRes.data.data || usersRes.data || []);
          setIsMockUsers(false);
        } catch (uErr) {
          console.warn('Failed to load real user statistics. Using fallback.', uErr);
          useFallbackUsers();
        }
      } else {
        useFallbackUsers();
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Không thể tải dữ liệu Dashboard. Vui lòng đăng nhập lại.');
    } finally {
      setLoading(false);
    }
  };

  const useFallbackUsers = () => {
    setUsersList([
      { user_id: 'admin', name: 'admin', registered_images: 1 },
      { user_id: 'user_test', name: 'User Tester', registered_images: 1 },
      { user_id: 'admin_test', name: 'Admin Tester', registered_images: 1 }
    ]);
    setIsMockUsers(true);
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
      currentAudio.play();
      setPlayingAudioId(postId);
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
      
      {/* ==================== CỘT TRÁI: QUÉT KHUÔN MẶT ==================== */}
      <div className="dashboard-col left-col">
        <section className="dashboard-card camera-card">
          <div className="card-title-header">
            <h3>Quét Khuôn Mặt Thông Minh</h3>
            <p className="card-subtitle">Auto scan mỗi 3 giây hoặc chụp thủ công khi cần.</p>
          </div>

          <div className="scanner-container">
            {isCameraOn ? (
              <>
                <CameraBox onCapture={handleCapture} captureTrigger={captureTrigger} />
                <div className="scan-reticle">
                  <div className="reticle-box"></div>
                  <div className="scan-laser"></div>
                </div>
              </>
            ) : (
              <div className="camera-placeholder">
                <div className="placeholder-icon">📷</div>
                <p>Camera đang tắt</p>
              </div>
            )}
          </div>

          <div className="scanner-actions" style={{ gap: '8px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              className={`action-pill ${isCameraOn ? 'active' : ''}`} 
              type="button" 
              onClick={() => setIsCameraOn((prev) => !prev)}
            >
              {isCameraOn ? '🔌 Tắt Camera' : '🔌 Bật Camera'}
            </button>
            {isCameraOn && (
              <button 
                className={`action-pill ${autoScan ? 'active' : ''}`} 
                type="button" 
                onClick={() => setAutoScan((prev) => !prev)}
              >
                {autoScan ? '⏸️ Tạm dừng Auto Scan' : '▶️ Bật Auto Scan'}
              </button>
            )}
          </div>

          <div className="scanner-logs">
            <div className="logs-header">Lịch sử check-in</div>
            <div className="logs-list">
              {scanLogs.map((log) => (
                <div key={log.id} className={`log-item-line ${log.type}`}>
                  {log.text}
                </div>
              ))}
            </div>
          </div>

          {preview && (
            <div className="face-preview-box">
              <span>Ảnh quét mới nhất:</span>
              <img className="face-img-small" src={preview} alt="face preview" />
            </div>
          )}
        </section>
      </div>

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
              <button className={activeGameCategory === 'all' ? 'active' : ''} onClick={() => setActiveGameCategory('all')}>Tất Cả</button>
              <button className={activeGameCategory === 'Puzzle' ? 'active' : ''} onClick={() => setActiveGameCategory('Puzzle')}>Giải Đố</button>
              <button className={activeGameCategory === 'Action' ? 'active' : ''} onClick={() => setActiveGameCategory('Action')}>Hành Động</button>
              <button className={activeGameCategory === 'Quiz' ? 'active' : ''} onClick={() => setActiveGameCategory('Quiz')}>Trắc Nghiệm</button>
              <button className={activeGameCategory === 'Casual' ? 'active' : ''} onClick={() => setActiveGameCategory('Casual')}>Vui Vẻ</button>
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
                {isMockUsers && (
                  <div className="mock-badge">💡 Dữ liệu mẫu (Quyền User)</div>
                )}
              </div>

              {/* SVG Bar Chart */}
              <div className="stats-chart-wrapper">
                <svg width="100%" height="110" viewBox="0 0 100 110" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  
                  {/* Horizontal reference lines */}
                  <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(148, 163, 184, 0.25)" strokeDasharray="2" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(148, 163, 184, 0.25)" strokeDasharray="2" />
                  <line x1="0" y1="80" x2="100" y2="80" stroke="rgba(148, 163, 184, 0.25)" strokeDasharray="2" />
                  <line x1="0" y1="90" x2="100" y2="90" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="1" />

                  {usersList.slice(0, 3).map((u, i) => {
                    const val = u.registered_images || 1;
                    // Compute height
                    const height = Math.min(70, val * 45);
                    const x = 12 + i * 30;
                    const y = 90 - height;
                    return (
                      <g key={u.user_id}>
                        <rect 
                          x={x} 
                          y={y} 
                          width="16" 
                          height={height} 
                          fill="url(#barGrad)" 
                          rx="4" 
                        />
                        <text 
                          x={x + 8} 
                          y="102" 
                          fontSize="6" 
                          fill="#94a3b8" 
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {u.user_id.substring(0, 6)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
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
              <iframe 
                src={getFullAssetUrl(activeGameUrl.url)} 
                title={activeGameUrl.title}
                allowFullScreen
                scrolling="no"
              />
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Article Modal */}
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
