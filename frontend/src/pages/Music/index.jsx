import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import './Music.css';
import * as api from '../../services/api';

export default function Music() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [playlists, setPlaylists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trạng thái phát nhạc
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const audioRef = useRef(null);

  useEffect(() => {
    loadMusicData();
  }, [selectedCategory]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

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

  const getFullAudioUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // Lấy domain của backend từ env hoặc mặc định localhost
    const base = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api/v1', '') 
      : 'http://localhost:8000';
    return `${base}${url}`;
  };

  const handlePlaySong = async (song) => {
    try {
      // 1. Nếu bấm vào bài đang phát -> Tạm dừng
      if (currentSong && currentSong.id === song.id) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play();
          setIsPlaying(true);
        }
        return;
      }

      // 2. Nếu bấm vào bài hát mới
      setCurrentSong(song);
      setIsPlaying(true);
      setCurrentTime(0);

      // Gọi API tăng lượt nghe
      await api.playSong(song.id);
      
      // Đồng bộ lượt nghe trên UI
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, plays: s.plays + 1 } : s));
    } catch (err) {
      console.error('Error playing song:', err);
    }
  };

  const handleLikeSong = async (songId) => {
    try {
      await api.likeSong(songId);
      loadMusicData();
      if (currentSong && currentSong.id === songId) {
        setCurrentSong(prev => ({ ...prev, likes: prev.likes + 1 }));
      }
    } catch (err) {
      console.error('Error liking song:', err);
    }
  };

  // Trình phát nhạc tự động cập nhật tiến trình
  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const onAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    if (audioRef.current && duration > 0) {
      const rect = e.target.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const newTime = (clickX / width) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="music-container" style={{ paddingBottom: currentSong ? '80px' : '0' }}>
      <Sidebar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      <div className="music-main">
        <div className="music-header">
          <h1>🎵 Âm Nhạc Trực Tuyến</h1>
          <p>Thưởng thức và thư giãn cùng các bài hát bản quyền đỉnh cao</p>
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
                      <div key={song.id} className={`song-item ${currentSong && currentSong.id === song.id ? 'active' : ''}`}>
                        <div className="song-info">
                          <h4>{song.title}</h4>
                          <p>{song.artist} • <span style={{ opacity: 0.8 }}>🎧 {song.plays} lượt nghe</span></p>
                        </div>
                        <div className="song-duration">{song.duration}</div>
                        <button 
                          onClick={() => handlePlaySong(song)} 
                          className="play-btn"
                          style={{ background: currentSong && currentSong.id === song.id && isPlaying ? 'rgba(255,255,255,0.4)' : '' }}
                        >
                          {currentSong && currentSong.id === song.id && isPlaying ? '⏸️' : '▶️'}
                        </button>
                        <button onClick={() => handleLikeSong(song.id)} className="play-btn" style={{ marginLeft: '8px' }}>
                          ❤️
                        </button>
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

      {/* Thẻ audio ẩn điều khiển âm thanh */}
      {currentSong && (
        <audio
          ref={audioRef}
          src={getFullAudioUrl(currentSong.file_url)}
          autoPlay={isPlaying}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onEnded={onAudioEnded}
        />
      )}

      {/* Thanh phát nhạc nổi ở cuối trang */}
      {currentSong && (
        <div className="audio-player-bar">
          <div className="player-info">
            <h4>{currentSong.title}</h4>
            <p>{currentSong.artist}</p>
          </div>

          <div className="player-controls">
            <div className="controls-buttons">
              <button className="player-btn">⏮️</button>
              <button className="player-btn play-pause" onClick={togglePlayPause}>
                {isPlaying ? '⏸️' : '▶'}
              </button>
              <button className="player-btn">⏭️</button>
            </div>

            <div className="progress-container">
              <span>{formatTime(currentTime)}</span>
              <div className="progress-bar" onClick={handleSeek}>
                <div 
                  className="progress-filled" 
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="player-volume">
            <span>🔊</span>
            <input 
              type="range" 
              className="volume-slider" 
              min="0" 
              max="1" 
              step="0.05" 
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
