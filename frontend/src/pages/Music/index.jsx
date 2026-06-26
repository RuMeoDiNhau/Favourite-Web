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
    genre: 'Update later',
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

  // Trạng thái quản lý danh sách phát
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistForm, setNewPlaylistForm] = useState({
    name: '',
    description: '',
    image_url: '🎵'
  });
  const [activePopoverSongId, setActivePopoverSongId] = useState(null);
  const availableEmojis = ['🎵', '📻', '🎧', '🎸', '🎹', '🍿', '🔥', '❤️', '🌟', '🍀', '✨', '☕', '🌧️', '⚡', '🌙', '🎉', '✈️', '🏖️', '🎮', '🧸'];

  const audioRef = useRef(null);

  useEffect(() => {
    loadMusicData();
  }, [selectedCategory, selectedPlaylist]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Đóng popover thêm vào playlist khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.playlist-popover-container')) {
        setActivePopoverSongId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const loadMusicData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (selectedCategory === 'all' || selectedCategory === 'playlist') {
        const playlistResponse = await api.fetchPlaylists();
        setPlaylists(playlistResponse.data || []);
      }
      
      let songsResponse;
      if (selectedPlaylist) {
        songsResponse = await api.fetchSongsByPlaylist(selectedPlaylist.id);
      } else if (selectedCategory === 'all') {
        songsResponse = await api.fetchAllMusic();
      } else if (selectedCategory === 'library') {
        songsResponse = await api.fetchPopularSongs();
      } else if (selectedCategory === 'favorite') {
        songsResponse = await api.fetchPopularSongs();
      } else if (selectedCategory === 'recent') {
        songsResponse = await api.fetchNewSongs();
      } else if (selectedCategory === 'playlist') {
        songsResponse = { data: [] };
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

  const handleDeletePlaylist = async (playlistId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa danh sách phát này?')) {
      try {
        await api.deletePlaylist(playlistId);
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          setSelectedPlaylist(null);
        }
        loadMusicData();
        alert('Đã xóa danh sách phát thành công!');
      } catch (err) {
        console.error('Error deleting playlist:', err);
        alert(err.response?.data?.detail || 'Không thể xóa danh sách phát');
      }
    }
  };

  const handleCreatePlaylistSubmit = async (e) => {
    e.preventDefault();
    if (!newPlaylistForm.name.trim()) {
      alert('Vui lòng nhập tên danh sách phát!');
      return;
    }
    try {
      await api.createPlaylist({
        name: newPlaylistForm.name.trim(),
        description: newPlaylistForm.description?.trim() || '',
        image_url: newPlaylistForm.image_url
      });
      setShowCreatePlaylistModal(false);
      setNewPlaylistForm({ name: '', description: '', image_url: '🎵' });
      loadMusicData();
      alert('Đã tạo danh sách phát thành công!');
    } catch (err) {
      console.error('Error creating playlist:', err);
      alert(err.response?.data?.detail || 'Không thể tạo danh sách phát');
    }
  };

  const handleAddSongToPlaylist = async (playlistId, songId) => {
    try {
      await api.addSongToPlaylist(playlistId, songId);
      setActivePopoverSongId(null);
      loadMusicData();
      alert('Đã thêm bài hát vào danh sách phát!');
    } catch (err) {
      console.error('Error adding song to playlist:', err);
      alert(err.response?.data?.detail || 'Không thể thêm bài hát vào danh sách phát');
    }
  };

  const handleRemoveSongFromPlaylist = async (songId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài hát này khỏi danh sách phát?')) {
      try {
        await api.removeSongFromPlaylist(songId);
        loadMusicData();
        alert('Đã xóa bài hát khỏi danh sách phát thành công!');
      } catch (err) {
        console.error('Error removing song from playlist:', err);
        alert(err.response?.data?.detail || 'Không thể xóa bài hát khỏi danh sách phát');
      }
    }
  };

  const handleNextSong = () => {
    if (songs && songs.length > 0 && currentSong) {
      const currentIndex = songs.findIndex(s => s.id === currentSong.id);
      if (currentIndex !== -1 && currentIndex < songs.length - 1) {
        handlePlaySong(songs[currentIndex + 1]);
      }
    }
  };

  const handlePrevSong = () => {
    if (songs && songs.length > 0 && currentSong) {
      const currentIndex = songs.findIndex(s => s.id === currentSong.id);
      if (currentIndex > 0) {
        handlePlaySong(songs[currentIndex - 1]);
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
    if (!uploadForm.title) {
      alert('Vui lòng điền tên bài hát!');
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
        artist: uploadForm.artist.trim() || 'Update later',
        genre: uploadForm.genre || 'Update later',
        duration: uploadForm.duration,
        file_url: mediaUrl,
        playlist_id: null
      });

      alert('Đã thêm bài hát vào thư viện thành công!');
      setShowUploadModal(false);
      setUploadForm({
        title: '',
        artist: '',
        genre: 'Update later',
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
    if (songs && songs.length > 0 && currentSong) {
      const currentIndex = songs.findIndex(s => s.id === currentSong.id);
      if (currentIndex !== -1 && currentIndex < songs.length - 1) {
        handlePlaySong(songs[currentIndex + 1]);
        return;
      }
    }
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
      <Sidebar 
        selectedCategory={selectedCategory} 
        onSelectCategory={(cat) => {
          setSelectedPlaylist(null);
          setSelectedCategory(cat);
        }} 
      />
      <div className="music-main">
        <div className="music-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', textAlign: 'left' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '48px', fontWeight: '700' }}>🎵 Âm Nhạc Trực Tuyến</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '18px', color: 'rgba(255, 255, 255, 0.8)' }}>Thưởng thức và thư giãn cùng các bài hát bản quyền đỉnh cao</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            {selectedCategory === 'playlist' && !selectedPlaylist && user && (
              <button 
                className="create-playlist-btn"
                onClick={() => setShowCreatePlaylistModal(true)}
              >
                ➕ Tạo Playlist
              </button>
            )}
            {user && user.role === 'admin' && (
              <button 
                className="upload-music-btn"
                onClick={() => setShowUploadModal(true)}
              >
                ➕ Thêm Nhạc
              </button>
            )}
          </div>
        </div>

        <div className="music-content">
          {loading ? (
            <p style={{ textAlign: 'center', color: 'white' }}>Đang tải âm nhạc...</p>
          ) : error ? (
            <p style={{ textAlign: 'center', color: '#ff6b6b' }}>{error}</p>
          ) : selectedPlaylist ? (
            /* Chi tiết Playlist */
            <div className="playlist-detail-view">
              <button className="playlist-back-btn" onClick={() => setSelectedPlaylist(null)}>
                ⬅️ Quay lại danh sách phát
              </button>
              
              <div className="playlist-detail-header">
                <div className="playlist-detail-art">{selectedPlaylist.image_url || '🎵'}</div>
                <div className="playlist-detail-info">
                  <span className="playlist-badge">DANH SÁCH PHÁT</span>
                  <h1>{selectedPlaylist.name}</h1>
                  {selectedPlaylist.description && <p className="playlist-description">{selectedPlaylist.description}</p>}
                  <div className="playlist-meta">
                    <span>{songs.length} bài hát</span>
                    {user && user.role === 'admin' && (
                      <button 
                        className="playlist-detail-delete-btn"
                        onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                      >
                        🗑️ Xóa Playlist
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="music-section">
                <h2>Danh sách bài hát</h2>
                {songs.length > 0 ? (
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
                        
                        {user && (
                          <button 
                            onClick={() => handleRemoveSongFromPlaylist(song.id)} 
                            className="play-btn remove-song-btn" 
                            style={{ marginLeft: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)' }}
                            title="Xóa khỏi danh sách phát"
                          >
                            ➖
                          </button>
                        )}

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
                ) : (
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic', marginTop: '20px' }}>
                    Danh sách phát này trống. Quay lại tab "Tất Cả" để thêm bài hát.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* View bình thường (Các danh mục All, Library, Favorite, Recent, Playlist tổng) */
            <>
              {selectedCategory === 'playlist' ? (
                <section className="music-section">
                  <h2>📻 Danh Sách Phát Của Tôi</h2>
                  {playlists.length > 0 ? (
                    <div className="playlist-grid">
                      {playlists.map(playlist => (
                        <div 
                          key={playlist.id} 
                          className="playlist-card"
                          onClick={() => setSelectedPlaylist(playlist)}
                        >
                          <div className="playlist-image">{playlist.image_url || '🎵'}</div>
                          <h3>{playlist.name}</h3>
                          <p>{playlist.song_count} bài hát</p>
                          {user && user.role === 'admin' && (
                            <button
                              className="playlist-card-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePlaylist(playlist.id);
                              }}
                              title="Xóa danh sách phát"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginTop: '20px' }}>
                      Chưa có danh sách phát nào. {user ? 'Bấm "Tạo Playlist" để bắt đầu!' : 'Vui lòng đăng nhập để tạo mới.'}
                    </p>
                  )}
                </section>
              ) : (
                /* Các danh mục bài hát (All, Library, Favorite, Recent) */
                <>
                  {/* Ở tab "Tất Cả", chúng ta vẫn show hàng ngang Playlists nếu có */}
                  {selectedCategory === 'all' && playlists.length > 0 && (
                    <section className="music-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ borderBottom: 'none', margin: 0 }}>📻 Danh Sách Phát Của Tôi</h2>
                        <button 
                          className="view-all-playlists-btn"
                          onClick={() => setSelectedCategory('playlist')}
                          style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: '600' }}
                        >
                          Xem tất cả →
                        </button>
                      </div>
                      <div className="playlist-grid">
                        {playlists.slice(0, 4).map(playlist => (
                          <div 
                            key={playlist.id} 
                            className="playlist-card"
                            onClick={() => {
                              setSelectedCategory('playlist');
                              setSelectedPlaylist(playlist);
                            }}
                          >
                            <div className="playlist-image">{playlist.image_url || '🎵'}</div>
                            <h3>{playlist.name}</h3>
                            <p>{playlist.song_count} bài hát</p>
                            {user && user.role === 'admin' && (
                              <button
                                className="playlist-card-delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePlaylist(playlist.id);
                                }}
                                title="Xóa danh sách phát"
                              >
                                🗑️
                              </button>
                            )}
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

                            {/* Dropdown Popover để thêm vào Playlist */}
                            {user && (
                              <div className="playlist-popover-container" style={{ position: 'relative', marginLeft: '8px' }}>
                                <button
                                  className="play-btn add-to-playlist-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePopoverSongId(activePopoverSongId === song.id ? null : song.id);
                                  }}
                                  title="Thêm vào danh sách phát"
                                >
                                  ➕
                                </button>
                                {activePopoverSongId === song.id && (
                                  <div className="playlist-popover">
                                    <div className="popover-header">Thêm vào playlist</div>
                                    <div className="popover-list">
                                      {playlists.length > 0 ? (
                                        playlists.map(playlist => (
                                          <button
                                            key={playlist.id}
                                            className="popover-item"
                                            onClick={() => handleAddSongToPlaylist(playlist.id, song.id)}
                                          >
                                            <span style={{ marginRight: '8px' }}>{playlist.image_url || '🎵'}</span>
                                            {playlist.name}
                                          </button>
                                        ))
                                      ) : (
                                        <div className="popover-empty">Chưa có playlist nào</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

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

                  {!loading && songs.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginTop: '40px' }}>Không có dữ liệu bài hát</p>
                  )}
                </>
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
              <button className="player-btn" onClick={handlePrevSong}>⏮️</button>
              <button className="player-btn play-pause" onClick={togglePlayPause}>
                {isPlaying ? '⏸️' : '▶'}
              </button>
              <button className="player-btn" onClick={handleNextSong}>⏭️</button>
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
                <label>Ca sĩ (Tác giả)</label>
                <input 
                  type="text" 
                  placeholder="Nhập tên ca sĩ (Mặc định: Update later)..." 
                  value={uploadForm.artist}
                  onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}
                  disabled={isUploading}
                />
              </div>

              <div className="music-form-group">
                <label>Thể loại</label>
                <select 
                  value={uploadForm.genre}
                  onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })}
                  disabled={isUploading}
                >
                  <option value="Update later">Chưa xác định (Update later)</option>
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
      )}

      {/* Modal Tạo Playlist (dành cho mọi User đăng nhập) */}
      {showCreatePlaylistModal && (
        <div className="music-modal-overlay">
          <div className="music-modal-content">
            <div className="music-modal-header">
              <h2 style={{ color: '#8b5cf6' }}>Tạo Danh Sách Phát Mới</h2>
              <button className="music-close-btn" onClick={() => setShowCreatePlaylistModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreatePlaylistSubmit} className="music-modal-body">
              <div className="music-form-group">
                <label>Tên danh sách phát *</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Nhạc Học Tập, Chill Vibes..." 
                  value={newPlaylistForm.name}
                  onChange={(e) => setNewPlaylistForm({ ...newPlaylistForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="music-form-group">
                <label>Mô tả</label>
                <input 
                  type="text" 
                  placeholder="Mô tả ngắn gọn về danh sách phát..." 
                  value={newPlaylistForm.description}
                  onChange={(e) => setNewPlaylistForm({ ...newPlaylistForm, description: e.target.value })}
                />
              </div>

              <div className="music-form-group">
                <label>Biểu tượng đại diện (Emoji) *</label>
                <div className="emoji-selector-panel">
                  {availableEmojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      className={`emoji-option-btn ${newPlaylistForm.image_url === emoji ? 'active' : ''}`}
                      onClick={() => setNewPlaylistForm({ ...newPlaylistForm, image_url: emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="music-modal-footer">
                <button 
                  type="button" 
                  className="music-cancel-btn" 
                  onClick={() => setShowCreatePlaylistModal(false)}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="music-submit-btn" 
                  style={{ backgroundColor: '#8b5cf6' }}
                >
                  Tạo mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
