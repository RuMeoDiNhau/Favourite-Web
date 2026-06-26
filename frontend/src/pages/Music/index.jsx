import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import './Music.css';
import * as api from '../../services/api';

export default function Music() {
  const user = (() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [playlists, setPlaylists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trạng thái upload nhạc dành cho Admin
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    artist: '',
    genre: 'Pop',
    duration: '00:00'
  });
  const [musicFile, setMusicFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleDeleteSong = async (songId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài hát này khỏi thư viện?')) {
      try {
        await api.deleteSong(songId);
        loadMusicData();
        if (currentSong && currentSong.id === songId) {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setCurrentSong(null);
          setIsPlaying(false);
        }
      } catch (err) {
        console.error('Error deleting song:', err);
        alert(err.response?.data?.detail || 'Không thể xóa bài hát');
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMusicFile(file);

    // Auto calculate duration using Audio API
    try {
      const audio = new Audio(URL.createObjectURL(file));
      audio.addEventListener('loadedmetadata', () => {
        const minutes = Math.floor(audio.duration / 60);
        const seconds = Math.floor(audio.duration % 60);
        const formatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        setUploadForm(prev => ({ ...prev, duration: formatted }));
      });
    } catch (err) {
      console.error('Failed to parse audio duration:', err);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!musicFile) {
      alert('Vui lòng chọn tệp nhạc!');
      return;
    }
    if (!uploadForm.title || !uploadForm.artist) {
      alert('Vui lòng điền đầy đủ tiêu đề và ca sĩ!');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Step 1: Upload music file
      const uploadRes = await api.uploadPostFile(musicFile, 'audio', (progress) => {
        setUploadProgress(progress);
      });

      const mediaUrl = uploadRes.data.media_url;
      if (!mediaUrl) {
        throw new Error('Không nhận được URL tệp tin sau khi upload');
      }

      // Step 2: Create song metadata in library
      await api.createSong({
        title: uploadForm.title,
        artist: uploadForm.artist,
        genre: uploadForm.genre,
        duration: uploadForm.duration,
        file_url: mediaUrl,
        playlist_id: null
      });

      alert('Đã thêm bài hát vào thư viện thành công!');
      setShowUploadModal(false);
      setUploadForm({
        title: '',
        artist: '',
        genre: 'Pop',
        duration: '00:00'
      });
      setMusicFile(null);
      setUploadProgress(0);
      loadMusicData();
    } catch (err) {
      console.error('Error uploading/creating music:', err);
      alert(err.response?.data?.detail || 'Quá trình upload hoặc thêm nhạc thất bại');
    } finally {
      setIsUploading(false);
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
        <div className="music-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', textAlign: 'left' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '48px', fontWeight: '700' }}>🎵 Âm Nhạc Trực Tuyến</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '18px', color: 'rgba(255, 255, 255, 0.8)' }}>Thưởng thức và thư giãn cùng các bài hát bản quyền đỉnh cao</p>
          </div>
          {user && user.role === 'admin' && (
            <button 
              className="upload-music-btn"
              onClick={() => setShowUploadModal(true)}
            >
              ➕ Thêm Nhạc
            </button>
          )}
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
                        {user && user.role === 'admin' && (
                          <button 
                            onClick={() => handleDeleteSong(song.id)} 
                            className="play-btn delete-song-btn" 
                            style={{ marginLeft: '8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                            title="Xóa bài hát"
                          >
                            🗑️
                          </button>
                        )}
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

      {/* Modal Upload nhạc (dành riêng cho Admin) */}
      {showUploadModal && (
        <div className="music-modal-overlay">
          <div className="music-modal-content">
            <div className="music-modal-header">
              <h2>Thêm Nhạc Vào Thư Viện</h2>
              <button className="music-close-btn" onClick={() => !isUploading && setShowUploadModal(false)}>×</button>
            </div>
            <form onSubmit={handleUploadSubmit} className="music-modal-body">
              <div className="music-form-group">
                <label>Tên bài hát *</label>
                <input 
                  type="text" 
                  placeholder="Nhập tên bài hát..." 
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  disabled={isUploading}
                  required
                />
              </div>

              <div className="music-form-group">
                <label>Ca sĩ *</label>
                <input 
                  type="text" 
                  placeholder="Nhập tên ca sĩ..." 
                  value={uploadForm.artist}
                  onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}
                  disabled={isUploading}
                  required
                />
              </div>

              <div className="music-form-group">
                <label>Thể loại</label>
                <select 
                  value={uploadForm.genre}
                  onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })}
                  disabled={isUploading}
                >
                  <option value="Pop">Pop</option>
                  <option value="Ballad">Ballad</option>
                  <option value="Rap">Rap / Hip-hop</option>
                  <option value="EDM">EDM / Dance</option>
                  <option value="Anime">Anime</option>
                  <option value="Rock">Rock</option>
                  <option value="Lofi">Lofi</option>
                  <option value="Soundtrack">Soundtrack</option>
                </select>
              </div>

              <div className="music-form-group">
                <label>Thời lượng (Được tính tự động)</label>
                <input 
                  type="text" 
                  value={uploadForm.duration}
                  onChange={(e) => setUploadForm({ ...uploadForm, duration: e.target.value })}
                  disabled={isUploading}
                  placeholder="00:00"
                />
              </div>

              <div className="music-form-group">
                <label>Tệp âm thanh (.mp3, .wav) *</label>
                <input 
                  type="file" 
                  accept="audio/*" 
                  onChange={handleFileChange}
                  disabled={isUploading}
                  required
                />
              </div>

              {isUploading && (
                <div className="music-progress-container">
                  <div className="music-progress-text">
                    <span>Đang tải lên...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="music-progress-bar">
                    <div className="music-progress-filled" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              <div className="music-modal-footer">
                <button 
                  type="button" 
                  className="music-cancel-btn" 
                  onClick={() => setShowUploadModal(false)}
                  disabled={isUploading}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="music-submit-btn" 
                  disabled={isUploading}
                >
                  {isUploading ? 'Đang xử lý...' : 'Tải lên & Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
