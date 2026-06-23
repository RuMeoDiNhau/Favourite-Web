import React, { useState, useEffect, useRef } from 'react';
import './Feed.css';
import * as api from '../../services/api';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Game iframe modal state
  const [activeGame, setActiveGame] = useState(null); // { url, title }

  // Audio elements state
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioRefs = useRef({});

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.fetchPosts();
      setPosts(response.data || []);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError(err.response?.data?.detail || 'Không thể tải bảng tin. Vui lòng đăng nhập lại.');
    } finally {
      setLoading(false);
    }
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
      // Pause any other playing audio
      if (playingAudioId && audioRefs.current[playingAudioId]) {
        audioRefs.current[playingAudioId].pause();
      }
      currentAudio.play();
      setPlayingAudioId(postId);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    return post.post_type === filter;
  });

  const getPostTypeLabel = (type) => {
    switch (type) {
      case 'image': return '📸 Ảnh';
      case 'video': return '🎥 Video';
      case 'audio': return '🎵 Nhạc';
      case 'game': return '🎮 Game';
      case 'text': return '📝 Bài viết';
      default: return type;
    }
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="feed-container">
      <div className="feed-header">
        <h1>📰 Bảng tin Fav Web</h1>
        <p>Chia sẻ khoảnh khắc, âm nhạc, video và trò chơi cùng bạn bè</p>
      </div>

      {/* Filter Tabs */}
      <div className="feed-filters">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>🌐 Tất cả</button>
        <button className={filter === 'image' ? 'active' : ''} onClick={() => setFilter('image')}>📸 Ảnh</button>
        <button className={filter === 'video' ? 'active' : ''} onClick={() => setFilter('video')}>🎥 Video</button>
        <button className={filter === 'audio' ? 'active' : ''} onClick={() => setFilter('audio')}>🎵 Nhạc</button>
        <button className={filter === 'game' ? 'active' : ''} onClick={() => setFilter('game')}>🎮 Game</button>
        <button className={filter === 'text' ? 'active' : ''} onClick={() => setFilter('text')}>📝 Bài viết</button>
      </div>

      {loading ? (
        <div className="feed-status-msg">
          <div className="spinner"></div>
          <p>Đang tải bảng tin...</p>
        </div>
      ) : error ? (
        <div className="feed-status-msg error-msg">
          <p>❌ {error}</p>
          <button className="retry-btn" onClick={loadPosts}>Thử lại</button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="feed-status-msg empty-msg">
          <p>📭 Chưa có bài viết nào thuộc thể loại này.</p>
        </div>
      ) : (
        <div className="feed-grid">
          {filteredPosts.map(post => (
            <div key={post.id} className={`feed-card post-type-${post.post_type}`}>
              {/* Card Header */}
              <div className="card-header">
                <div className="author-avatar">
                  {post.user_id.substring(0, 2).toUpperCase()}
                </div>
                <div className="author-info">
                  <span className="author-name">@{post.user_id}</span>
                  <span className="post-date">{formatDate(post.created_at)}</span>
                </div>
                <span className={`post-type-badge ${post.post_type}`}>
                  {getPostTypeLabel(post.post_type)}
                </span>
              </div>

              {/* Card Content */}
              <div className="card-content">
                <h3 className="post-title">{post.title}</h3>
                
                {post.description && (
                  <p className="post-description">{post.description}</p>
                )}

                {/* Media Renderers */}
                {post.post_type === 'image' && post.media_url && (
                  <div className="media-preview image-preview">
                    <img 
                      src={getFullAssetUrl(post.media_url)} 
                      alt={post.title} 
                      loading="lazy"
                    />
                  </div>
                )}

                {post.post_type === 'video' && post.media_url && (
                  <div className="media-preview video-preview">
                    <video 
                      src={getFullAssetUrl(post.media_url)} 
                      controls 
                      preload="metadata"
                      playsInline
                    />
                  </div>
                )}

                {post.post_type === 'audio' && post.media_url && (
                  <div className="media-preview audio-preview-container">
                    <div className="audio-card-layout">
                      {post.thumbnail ? (
                        <img 
                          className="audio-album-art" 
                          src={getFullAssetUrl(post.thumbnail)} 
                          alt="Album Art" 
                        />
                      ) : (
                        <div className="audio-album-art-placeholder">🎵</div>
                      )}
                      <div className="audio-player-controls">
                        <span className="audio-title-display">{post.title}</span>
                        <button 
                          className="audio-custom-play-btn" 
                          onClick={() => handleAudioPlayPause(post.id)}
                        >
                          {playingAudioId === post.id ? '⏸️ Tạm dừng' : '▶️ Phát nhạc'}
                        </button>
                        <audio
                          ref={el => audioRefs.current[post.id] = el}
                          src={getFullAssetUrl(post.media_url)}
                          onEnded={() => setPlayingAudioId(null)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {post.post_type === 'game' && (
                  <div className="media-preview game-preview-container">
                    {post.thumbnail ? (
                      <div className="game-card-bg-image" style={{ backgroundImage: `url(${getFullAssetUrl(post.thumbnail)})` }}>
                        <div className="game-overlay-action">
                          <button 
                            className="play-game-btn"
                            onClick={() => setActiveGame({ url: post.media_url, title: post.title })}
                          >
                            🎮 Chơi trực tuyến
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="game-card-no-thumbnail">
                        <span className="game-icon-large">🎮</span>
                        <button 
                          className="play-game-btn"
                          onClick={() => setActiveGame({ url: post.media_url, title: post.title })}
                        >
                          🎮 Chơi trực tuyến
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline Game Overlay Modal */}
      {activeGame && (
        <div className="game-overlay-modal" onClick={() => setActiveGame(null)}>
          <div className="game-modal-content" onClick={e => e.stopPropagation()}>
            <div className="game-modal-header">
              <h2>🎮 {activeGame.title}</h2>
              <button className="close-game-btn" onClick={() => setActiveGame(null)}>✕ Đóng</button>
            </div>
            <div className="game-modal-body">
              <iframe 
                src={getFullAssetUrl(activeGame.url)} 
                title={activeGame.title}
                allowFullScreen
                scrolling="no"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
