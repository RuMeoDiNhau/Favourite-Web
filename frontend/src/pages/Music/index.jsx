import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import './Music.css';
import * as api from '../../services/api';

export default function Music() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [playlists, setPlaylists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMusicData();
  }, [selectedCategory]);

  const loadMusicData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (selectedCategory === 'all' || selectedCategory === 'playlist') {
        const playlistResponse = await api.fetchPlaylists();
        setPlaylists(playlistResponse.data || []);
      }
      
      let songsResponse;
      if (selectedCategory === 'all') {
        songsResponse = await api.fetchAllMusic();
      } else if (selectedCategory === 'library') {
        songsResponse = await api.fetchPopularSongs();
      } else if (selectedCategory === 'favorite') {
        songsResponse = await api.fetchPopularSongs();
      } else if (selectedCategory === 'recent') {
        songsResponse = await api.fetchNewSongs();
      } else {
        songsResponse = await api.fetchAllMusic();
      }
      setSongs(songsResponse.data || []);
    } catch (err) {
      console.error('Error loading music:', err);
      setError('Failed to load music data');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = async (songId) => {
    try {
      await api.playSong(songId);
      loadMusicData();
    } catch (err) {
      console.error('Error playing song:', err);
    }
  };

  const handleLikeSong = async (songId) => {
    try {
      await api.likeSong(songId);
      loadMusicData();
    } catch (err) {
      console.error('Error liking song:', err);
    }
  };

  return (
    <div className="music-container">
      <Sidebar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      <div className="music-main">
        <div className="music-header">
          <h1>🎵 Âm Nhạc</h1>
          <p>Khám phá và thưởng thức những giai điệu tuyệt vời</p>
        </div>

        <div className="music-content">
          {loading ? (
            <p style={{ textAlign: 'center', color: 'white' }}>Đang tải âm nhạc...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', color: '#ff6b6b' }}>{error}</p>
          ) : (
            <>
              {(selectedCategory === 'all' || selectedCategory === 'playlist') && playlists.length > 0 && (
                <section className="music-section">
                  <h2>📻 Danh Sách Phát Của Tôi</h2>
                  <div className="playlist-grid">
                    {playlists.map(playlist => (
                      <div key={playlist.id} className="playlist-card">
                        <div className="playlist-image">{playlist.image_url}</div>
                        <h3>{playlist.name}</h3>
                        <p>{playlist.song_count} bài hát</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {songs.length > 0 && (
                <section className="music-section">
                  <h2>🎵 {selectedCategory === 'all' ? 'Nhạc Mới Phát Hành' : 'Bài Hát'}</h2>
                  <div className="songs-list">
                    {songs.map(song => (
                      <div key={song.id} className="song-item">
                        <div className="song-info">
                          <h4>{song.title}</h4>
                          <p>{song.artist}</p>
                        </div>
                        <div className="song-duration">{song.duration}</div>
                        <button onClick={() => handlePlaySong(song.id)} className="play-btn">▶️</button>
                        <button onClick={() => handleLikeSong(song.id)} className="play-btn" style={{ marginLeft: '8px' }}>❤️</button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {!loading && songs.length === 0 && playlists.length === 0 && (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>Không có dữ liệu</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
