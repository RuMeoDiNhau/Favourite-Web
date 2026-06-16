import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import './Games.css';
import * as api from '../../services/api';

export default function Games() {
  const [selectedLibrary, setSelectedLibrary] = useState('all');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGames();
  }, [selectedLibrary]);

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

  const handlePlayGame = async (gameId) => {
    try {
      await api.playGame(gameId);
      loadGames();
    } catch (err) {
      console.error('Error playing game:', err);
    }
  };

  const handleLikeGame = async (gameId) => {
    try {
      await api.likeGame(gameId);
      loadGames();
    } catch (err) {
      console.error('Error liking game:', err);
    }
  };

  return (
    <div className="games-container">
      <Sidebar selectedLibrary={selectedLibrary} onSelectLibrary={setSelectedLibrary} />
      <div className="games-main">
        <div className="games-header">
          <h1>🎮 Trò Chơi</h1>
          <p>Khám phá và thưởng thức bộ sưu tập trò chơi đa dạng</p>
        </div>

        <div className="games-content">
          {loading ? (
            <p style={{ textAlign: 'center', color: 'white' }}>Đang tải trò chơi...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', color: '#ff6b6b' }}>{error}</p>
          ) : (
            <>
              <section className="games-section">
                <h2>{selectedLibrary === 'all' ? '🎮 Tất Cả Trò Chơi' : `📁 ${selectedLibrary}`}</h2>
                <div className="games-grid">
                  {games.length > 0 ? (
                    games.map(game => (
                      <div key={game.id} className="game-card">
                        <div className="game-image">{game.image_url}</div>
                        <h3>{game.name}</h3>
                        <p>{game.description}</p>
                        <div className="game-stats">
                          <span>👁️ {game.plays}</span>
                          <span>❤️ {game.likes}</span>
                        </div>
                        <div className="game-actions">
                          <button onClick={() => handlePlayGame(game.id)} className="action-btn">▶️ Chơi</button>
                          <button onClick={() => handleLikeGame(game.id)} className="action-btn">❤️ Thích</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                      Không có trò chơi nào
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
