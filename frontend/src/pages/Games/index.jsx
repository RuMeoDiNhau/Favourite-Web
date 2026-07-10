import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import './Games.css';
import * as api from '../../services/api';

export default function Games({ searchOpenGameId = null, onConsumeSearchOpen }) {
  const [selectedLibrary, setSelectedLibrary] = useState('all');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null); // Trạng thái bài viết đang đọc chi tiết
  const [stats, setStats] = useState({ totalPosts: 0, totalCategories: 0 });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadGames();
  }, [selectedLibrary]);

  // Search deep-open: when the navbar asks us to open a specific
  // game, find it in the loaded list and open the detail modal.
  // We wait for games to load first; ids that don't match any row
  // (e.g. wrong category) are silently consumed.
  useEffect(() => {
    if (searchOpenGameId == null) return;
    if (loading) return;
    const target = games.find((g) => g.id === searchOpenGameId);
    if (target) {
      handleViewGame(target);
    }
    onConsumeSearchOpen?.();
  }, [searchOpenGameId, loading, games]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.fetchGames();
        const allGames = response.data || [];
        const uniqueCategories = Array.from(new Set(allGames.map(g => g.category).filter(Boolean)));
        setCategories(uniqueCategories);
        setStats({
          totalPosts: allGames.length,
          totalCategories: uniqueCategories.length
        });
      } catch (err) {
        console.error('Error fetching game stats:', err);
      }
    };
    fetchStats();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);
      let response;
      if (selectedLibrary === 'all') {
        response = await api.fetchGames();
      } else {
        response = await api.fetchGamesByCategory(selectedLibrary);
      }
      setGames(response.data || []);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const handleViewGame = async (game) => {
    try {
      // Gọi API để tăng lượt xem (views) trong DB
      await api.viewGame(game.id);
      setSelectedGame(game);
      // Cập nhật lại số lượt xem trên UI bằng cách cộng thêm 1 hoặc load lại danh sách
      setGames(prevGames => 
        prevGames.map(g => g.id === game.id ? { ...g, views: g.views + 1 } : g)
      );
    } catch (err) {
      console.error('Error viewing game post:', err);
      setSelectedGame(game); // Vẫn mở đọc bài dù API đếm lượt xem lỗi
    }
  };

  const handleLikeGame = async (gameId) => {
    try {
      await api.likeGame(gameId);
      // Dashboard event — fires in parallel with the global counter
      // bump the backend already did. Best-effort: a failed tracking
      // call must not interrupt the UI.
      api.trackActivity({
        content_type: 'game', content_id: gameId, event_type: 'like',
      }).catch(() => { /* dashboard is best-effort */ });
      // Load lại danh sách để lấy số lượt thích mới
      const response = selectedLibrary === 'all' ? await api.fetchGames() : await api.fetchGamesByCategory(selectedLibrary);
      setGames(response.data || []);
      // Nếu đang mở Modal của chính bài viết đó, cập nhật luôn số lượt thích trong Modal
      if (selectedGame && selectedGame.id === gameId) {
        setSelectedGame(prev => ({ ...prev, likes: prev.likes + 1 }));
      }
    } catch (err) {
      console.error('Error liking game post:', err);
    }
  };

  const handleCloseModal = () => {
    setSelectedGame(null);
    loadGames(); // Load lại toàn bộ danh sách khi đóng modal để đồng bộ dữ liệu
  };

  return (
    <div className="games-container">
      <Sidebar 
        selectedLibrary={selectedLibrary} 
        onSelectLibrary={setSelectedLibrary} 
        stats={stats} 
        categories={categories} 
      />
      <div className="games-main">
        <div className="games-header">
          <h1>
            <img 
              src="/game-icon.png" 
              alt="Games Icon" 
              style={{ width: '42px', height: '42px', display: 'inline-block', verticalAlign: 'middle', marginRight: '10px', borderRadius: '8px' }} 
            />
            Tin Tức & Blog Game
          </h1>
          <p>Cập nhật những bài viết, hướng dẫn và mẹo chơi game mới nhất</p>
        </div>

        <div className="games-content">
          {loading ? (
            <p style={{ textAlign: 'center', color: 'white' }}>Đang tải danh sách bài viết...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', color: '#ff6b6b' }}>{error}</p>
          ) : (
            <>
              <section className="games-section">
                <h2>{selectedLibrary === 'all' ? '📰 Tất Cả Bài Viết' : `📁 Thể loại: ${selectedLibrary}`}</h2>
                <div className="games-grid">
                  {games.length > 0 ? (
                    games.map(game => (
                      <div key={game.id} className="game-card" onClick={() => handleViewGame(game)}>
                        <div className="game-image">{game.image_url}</div>
                        <h3>{game.title}</h3>
                        <p>{game.description}</p>
                        <div className="game-stats">
                          <span>👁️ {game.views} lượt xem</span>
                          <span>❤️ {game.likes} thích</span>
                        </div>
                        <div className="game-actions" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleViewGame(game)} className="action-btn">📖 Đọc bài</button>
                          <button onClick={() => handleLikeGame(game.id)} className="action-btn">❤️ Thích</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                      Không có bài viết nào
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* Modal chi tiết bài viết */}
      {selectedGame && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseModal}>&times;</button>
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
                onClick={() => handleLikeGame(selectedGame.id)} 
                className="action-btn"
                style={{ maxWidth: '120px', background: 'rgba(255, 107, 107, 0.3)', borderColor: '#ff6b6b' }}
              >
                ❤️ Thích bài viết
              </button>
              <button onClick={handleCloseModal} className="action-btn" style={{ maxWidth: '100px' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
