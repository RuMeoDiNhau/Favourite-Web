import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import './Music.css';
import { resolveBackendOrigin } from '../../lib/apiBase';
import * as api from '../../services/api';
import { readJson } from '../../lib/safeStorage';
import { getLikedSongIds, toggleLikedSong, isLikedSong } from '../../lib/likedSongs';
import { useBookmarks } from '../../lib/BookmarksContext';
import { useTranslation } from 'react-i18next';

export default function Music({ currentUser }) {
  // Use prop from App.jsx (React state from /auth/me) as source of truth.
  // localStorage.user was removed from the codebase, so readJson('user') returns null.
  const user = currentUser;
  const isAdmin = Boolean(user && user.role === 'admin');
  const { t } = useTranslation();
  const { isBookmarked: isBm, toggle: toggleBm } = useBookmarks();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [playlists, setPlaylists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [musicStats, setMusicStats] = useState({ totalSongs: 0, totalPlaylists: 0, totalDuration: '0h 00m' });

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

  useEffect(() => {
    loadMusicStats();
  }, []);

  const loadMusicStats = async () => {
    try {
      const [songsRes, playlistsRes] = await Promise.all([
        api.fetchAllMusic(),
        api.fetchPlaylists()
      ]);
      const allSongs = songsRes.data || [];
      const allPlaylists = playlistsRes.data || [];

      let totalSeconds = 0;
      allSongs.forEach(song => {
        if (song.duration) {
          const parts = song.duration.split(':');
          if (parts.length === 2) {
            const min = parseInt(parts[0], 10) || 0;
            const sec = parseInt(parts[1], 10) || 0;
            totalSeconds += (min * 60) + sec;
          }
        }
      });

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const durationStr = `${hours}h ${minutes}m`;

      setMusicStats({
        totalSongs: allSongs.length,
        totalPlaylists: allPlaylists.length,
        totalDuration: durationStr
      });
    } catch (err) {
      console.error('Error loading music stats:', err);
    }
  };

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
        // Favorites tab: read liked song ids from localStorage and filter
        // the full music list. Backend endpoint `/users/me/liked-songs` is
        // planned; until then this is the source of truth client-side.
        const allSongsRes = await api.fetchAllMusic();
        const likedIds = GetLikedSongIds();
        songsResponse = {
          data: (allSongsRes.data || []).filter((s) => likedIds.has(s.id)),
        };
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
      setError(t('music.err.load'));
    } finally {
      setLoading(false);
    }
  };

  const getFullAudioUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // Lấy domain của backend từ env hoặc mặc định localhost
    const base = resolveBackendOrigin(import.meta.env.VITE_API_URL);
    return `${base}${url}`;
  };

  const handlePlaySong = (song) => {
    try {
      const audio = audioRef.current;
      const fullUrl = getFullAudioUrl(song.file_url);

      // 1. Bấm vào bài đang phát -> Tạm dừng / Phát tiếp
      if (currentSong && currentSong.id === song.id) {
        if (isPlaying) {
          if (audio) audio.pause();
          setIsPlaying(false);
        } else {
          if (audio) {
            audio.play()
              .then(() => setIsPlaying(true))
              .catch((err) => console.warn('Audio play() rejected:', err));
          }
        }
        return;
      }

      // 2. Bấm vào bài hát mới -> Phát ngay lập tức trong luồng click của user
      setCurrentSong(song);
      setCurrentTime(0);
      setIsPlaying(true);

      if (song.duration) {
        const parts = song.duration.split(':');
        if (parts.length === 2) {
          const sec = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
          if (sec > 0) setDuration(sec);
        }
      }

      if (audio) {
        audio.src = fullUrl;
        audio.load();
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch((err) => {
              console.warn('Audio play() initial call deferred:', err);
              const playOnCanPlay = () => {
                audio.play()
                  .then(() => setIsPlaying(true))
                  .catch((e) => {
                    console.warn('Retry audio.play() failed:', e);
                    setIsPlaying(false);
                  });
              };
              audio.addEventListener('canplay', playOnCanPlay, { once: true });
            });
        }
      }

      // Gọi API tăng lượt nghe (chạy ngầm không làm đơ UI)
      api.playSong(song.id).catch(() => {});
      api.trackActivity({
        content_type: 'music', content_id: song.id, event_type: 'play',
      }).catch(() => {});

      // Đồng bộ lượt nghe trên UI
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, plays: (s.plays || 0) + 1 } : s));
    } catch (err) {
      console.error('Error playing song:', err);
    }
  };

  const handleLikeSong = async (songId) => {
    // BE only exposes POST /music/{id}/like (no /unlike). Drive the
    // liked-state from localStorage and only call the backend when going
    // from "not liked" → "liked". Previously we always called /like AND
    // toggled localStorage, so a second click bumped the backend count by
    // another +1 but left the song stuck in Favorites forever.
    const wasLiked = isLikedSong(songId);
    const nowLiked = toggleLikedSong(songId);
    const delta = nowLiked ? 1 : -1;
    try {
      if (nowLiked && !wasLiked) {
        await api.likeSong(songId);
        // Dashboard event — fired only on the rising edge to match
        // the backend global counter (which is also +1 on like and
        // has no unlike endpoint). Unlike toggling back, the user
        // can re-like to fire again, which is the same shape as the
        // global counter.
        api.trackActivity({
          content_type: 'music', content_id: songId, event_type: 'like',
        }).catch(() => { /* dashboard is best-effort */ });
      }
      loadMusicData();
      if (currentSong && currentSong.id === songId) {
        setCurrentSong(prev => ({ ...prev, likes: Math.max(0, (prev.likes || 0) + delta) }));
      }
    } catch (err) {
      // Roll back local toggle so the UI matches the server state.
      toggleLikedSong(songId);
      console.error('Error toggling song like; reverted local state', err);
    }
  };

  const handleDeleteSong = async (songId) => {
    if (window.confirm(t('music.confirm.deleteSong'))) {
      try {
        await api.deleteSong(songId);
        loadMusicData();
        loadMusicStats();
        if (currentSong && currentSong.id === songId) {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setCurrentSong(null);
          setIsPlaying(false);
        }
      } catch (err) {
        console.error('Error deleting song:', err);
        alert(err.response?.data?.detail || t('music.err.deleteSong'));
      }
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (window.confirm(t('music.confirm.deletePlaylist'))) {
      try {
        await api.deletePlaylist(playlistId);
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          setSelectedPlaylist(null);
        }
        loadMusicData();
        loadMusicStats();
        alert(t('music.ok.deletePlaylist'));
      } catch (err) {
        console.error('Error deleting playlist:', err);
        alert(err.response?.data?.detail || t('music.err.deletePlaylist'));
      }
    }
  };

  const handleCreatePlaylistSubmit = async (e) => {
    e.preventDefault();
    if (!newPlaylistForm.name.trim()) {
      alert(t('music.err.playlistNameRequired'));
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
      loadMusicStats();
      alert(t('music.ok.createPlaylist'));
    } catch (err) {
      console.error('Error creating playlist:', err);
      alert(err.response?.data?.detail || t('music.err.createPlaylist'));
    }
  };

  const handleAddSongToPlaylist = async (playlistId, songId) => {
    try {
      await api.addSongToPlaylist(playlistId, songId);
      setActivePopoverSongId(null);
      loadMusicData();
      loadMusicStats();
      alert(t('music.ok.addSongToPlaylist'));
    } catch (err) {
      console.error('Error adding song to playlist:', err);
      alert(err.response?.data?.detail || t('music.err.addSongToPlaylist'));
    }
  };

  const handleRemoveSongFromPlaylist = async (songId) => {
    if (window.confirm(t('music.confirm.removeSongFromPlaylist'))) {
      try {
        await api.removeSongFromPlaylist(songId);
        loadMusicData();
        loadMusicStats();
        alert(t('music.ok.removeSongFromPlaylist'));
      } catch (err) {
        console.error('Error removing song from playlist:', err);
        alert(err.response?.data?.detail || t('music.err.removeSongFromPlaylist'));
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

  // Probe audio element used to extract the duration of a user-selected file.
  // Holds the in-flight blob URL so we can revoke it exactly once on metadata
  // load, on error, or on modal unmount.
  const probeAudioRef = useRef(null);

  useEffect(() => () => {
    if (probeAudioRef.current && probeAudioRef.current.src) {
      URL.revokeObjectURL(probeAudioRef.current.src);
      probeAudioRef.current = null;
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMusicFile(file);

    // Revoke the previous probe's blob URL before allocating a new one.
    if (probeAudioRef.current && probeAudioRef.current.src) {
      URL.revokeObjectURL(probeAudioRef.current.src);
    }

    // Auto calculate duration using Audio API.
    // We free the blob URL immediately after extracting the duration (the
    // most common case) and again on error / unmount — previously this URL
    // was never revoked, leaking one full file-size blob per selection.
    try {
      const objectUrl = URL.createObjectURL(file);
      const audio = new Audio(objectUrl);
      probeAudioRef.current = audio;
      audio.addEventListener('loadedmetadata', () => {
        const minutes = Math.floor(audio.duration / 60);
        const seconds = Math.floor(audio.duration % 60);
        const formatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        setUploadForm(prev => ({ ...prev, duration: formatted }));
        URL.revokeObjectURL(objectUrl);
        audio.src = '';
      });
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        console.error('Failed to parse audio metadata');
      });
    } catch (err) {
      console.error('Failed to parse audio duration:', err);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!musicFile) {
      alert(t('music.err.fileRequired'));
      return;
    }
    if (!uploadForm.title) {
      alert(t('music.err.titleRequired'));
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Upload file → backend extracts duration via mutagen, saves to S3/local.
      const uploadRes = await api.uploadMusicFile(musicFile, (progress) => {
        setUploadProgress(progress);
      });

      const { file_url: mediaUrl, duration: detectedDuration } = uploadRes.data;
      if (!mediaUrl) {
        throw new Error(t('music.err.noUrl'));
      }

      // Create song metadata — use server-detected duration when frontend
      // couldn't auto-detect it (stays '00:00').
      const finalDuration =
        uploadForm.duration && uploadForm.duration !== '00:00'
          ? uploadForm.duration
          : detectedDuration;

      await api.createSong({
        title: uploadForm.title,
        artist: uploadForm.artist.trim() || 'Update later',
        genre: uploadForm.genre || 'Update later',
        duration: finalDuration,
        file_url: mediaUrl,
        playlist_id: null
      });

      alert(t('music.ok.upload'));
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
      loadMusicStats();
    } catch (err) {
      console.error('Error uploading/creating music:', err);
      alert(err.response?.data?.detail || t('music.err.upload'));
    } finally {
      setIsUploading(false);
    }
  };

  // When the active song changes, the <audio> src changes but autoPlay
  // is a one-time HTML attribute that only fires on mount. We must call
  // play() explicitly whenever the song id changes so every song plays.
  useEffect(() => {
    if (!currentSong || !audioRef.current) return;
    const audio = audioRef.current;
    const tryPlay = () => {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Autoplay blocked by browser:', err);
          setIsPlaying(false);
        });
    };
    // If the audio is already loadable, play right away.
    // Otherwise wait for canplay so we don't get a NotAllowedError.
    if (audio.readyState >= 2) {
      tryPlay();
    } else {
      audio.addEventListener('canplay', tryPlay, { once: true });
      return () => audio.removeEventListener('canplay', tryPlay);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id]);

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
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn('Audio play() rejected', err));
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
        stats={musicStats}
      />
      <div className="music-main">
        <div className="music-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', textAlign: 'left' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '48px', fontWeight: '700', display: 'flex', alignItems: 'center' }}>
              <img
                src="/music-icon.png"
                alt={t('music.altIcon')}
                style={{ width: '48px', height: '48px', marginRight: '15px', borderRadius: '8px' }}
              />
              {t('music.heading')}
            </h1>
            <p className="music-header-subtitle">{t('music.subtitle')}</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            {selectedCategory === 'playlist' && !selectedPlaylist && user && (
              <button
                className="create-playlist-btn"
                onClick={() => setShowCreatePlaylistModal(true)}
              >
                ➕ {t('music.createPlaylist')}
              </button>
            )}
            {isAdmin && (
              <button 
                className="upload-music-btn"
                onClick={() => setShowUploadModal(true)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#8b5cf6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.6)',
                  whiteSpace: 'nowrap'
                }}
              >
                ➕ Thêm Nhạc (POST /music)
              </button>
            )}
          </div>
        </div>

        <div className="music-content">
          {loading ? (
            <p style={{ textAlign: 'center', color: 'white' }}>{t('music.loading')}</p>
          ) : error ? (
            <p className="music-error-text">{error}</p>
          ) : selectedPlaylist ? (
            /* Chi tiết Playlist */
            <div className="playlist-detail-view">
              <button className="playlist-back-btn" onClick={() => setSelectedPlaylist(null)}>
                ⬅️ {t('music.backToPlaylists')}
              </button>

              <div className="playlist-detail-header">
                <div className="playlist-detail-art">{selectedPlaylist.image_url || '🎵'}</div>
                <div className="playlist-detail-info">
                  <span className="playlist-badge">{t('music.playlistBadge')}</span>
                  <h1>{selectedPlaylist.name}</h1>
                  {selectedPlaylist.description && <p className="playlist-description">{selectedPlaylist.description}</p>}
                  <div className="playlist-meta">
                    <span>{songs.length} {t('music.songLabel')}</span>
                    {user && user.role === 'admin' && (
                      <button
                        className="playlist-detail-delete-btn"
                        onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                      >
                        🗑️ {t('music.deletePlaylist')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="music-section">
                <h2>{t('music.songList')}</h2>
                {songs.length > 0 ? (
                  <div className="songs-list">
                    {songs.map(song => (
                      <div key={song.id} className={`song-item ${currentSong && currentSong.id === song.id ? 'active' : ''}`}>
                        <div className="song-info">
                          <h4>{song.title}</h4>
                          <p>{song.artist} • <span style={{ opacity: 0.8 }}>🎧 {song.plays} {t('music.playsLabel')}</span></p>
                        </div>
                        <div className="song-duration">{song.duration}</div>
                        <button
                          onClick={() => handlePlaySong(song)}
                          className="play-btn"
                          style={{ background: currentSong && currentSong.id === song.id && isPlaying ? 'rgba(255,255,255,0.4)' : '' }}
                          aria-label={t('music.play')}
                        >
                          {currentSong && currentSong.id === song.id && isPlaying ? (
                            '⏸️'
                          ) : (
                            <img
                              src="/play-icon.png"
                              alt={t('music.play')}
                              style={{ width: '22px', height: '22px', verticalAlign: 'middle' }}
                            />
                          )}
                        </button>
                        <button onClick={() => handleLikeSong(song.id)} className="play-btn" style={{ marginLeft: '8px' }} aria-label={t('music.like')}>
                          ❤️
                        </button>
                        <button
                          onClick={() => toggleBm('music', song.id)}
                          className={`play-btn ${isBm('music', song.id) ? 'bookmark-active' : ''}`}
                          style={{ marginLeft: '8px' }}
                          title={isBm('music', song.id) ? t('music.unbookmark') : t('music.bookmark')}
                          aria-label={isBm('music', song.id) ? t('music.unbookmark') : t('music.bookmark')}
                        >
                          {isBm('music', song.id) ? '🔖' : '⚪'}
                        </button>

                        {user && (
                          <button
                            onClick={() => handleRemoveSongFromPlaylist(song.id)}
                            className="play-btn remove-song-btn"
                            style={{ marginLeft: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)' }}
                            title={t('music.removeFromPlaylist')}
                          >
                            ➖
                          </button>
                        )}

                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteSong(song.id)} 
                            className="play-btn delete-song-btn" 
                            style={{ marginLeft: '8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                            title={t('music.deleteSong')}
                          >
                            <img
                              src="/delete-song-icon.png"
                              alt={t('music.deleteSong')}
                              style={{ width: '22px', height: '22px', verticalAlign: 'middle' }}
                            />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="music-empty-text">{t('music.playlistEmpty')}</p>
                )}
              </div>
            </div>
          ) : (
            /* View bình thường (Các danh mục All, Library, Favorite, Recent, Playlist tổng) */
            <>
              {selectedCategory === 'playlist' ? (
                <section className="music-section">
                  <h2>📻 {t('music.myPlaylists')}</h2>
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
                          {isAdmin && (
                            <button
                              className="playlist-card-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePlaylist(playlist.id);
                              }}
                              title={t('music.deletePlaylist')}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="music-empty-text">
                      {user ? t('music.emptyPlaylistsJoin', { empty: t('music.noPlaylists'), cta: t('music.noPlaylistsCTA') }) : t('music.noPlaylistsAnonymous')}
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
                        <h2 style={{ borderBottom: 'none', margin: 0 }}>📻 {t('music.myPlaylists')}</h2>
                        <button
                          className="view-all-playlists-btn"
                          onClick={() => setSelectedCategory('playlist')}
                        >
                          {t('music.viewAll')} →
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
                            {isAdmin && (
                              <button
                                className="playlist-card-delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePlaylist(playlist.id);
                                }}
                                title={t('music.deletePlaylist')}
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
                      <h2>🎵 {selectedCategory === 'all' ? t('music.newReleases') : t('music.songs')}</h2>
                      <div className="songs-list">
                        {songs.map(song => (
                          <div key={song.id} className={`song-item ${currentSong && currentSong.id === song.id ? 'active' : ''}`}>
                            <div className="song-info">
                              <h4>{song.title}</h4>
                              <p>{song.artist} • <span style={{ opacity: 0.8 }}>🎧 {song.plays} {t('music.playsLabel')}</span></p>
                            </div>
                            <div className="song-duration">{song.duration}</div>
                            <button
                              onClick={() => handlePlaySong(song)}
                              className="play-btn"
                              style={{ background: currentSong && currentSong.id === song.id && isPlaying ? 'rgba(255,255,255,0.4)' : '' }}
                              aria-label={t('music.play')}
                            >
                              {currentSong && currentSong.id === song.id && isPlaying ? (
                                '⏸️'
                              ) : (
                                <img
                                  src="/play-icon.png"
                                  alt={t('music.play')}
                                  style={{ width: '22px', height: '22px', verticalAlign: 'middle' }}
                                />
                              )}
                            </button>
                            <button onClick={() => handleLikeSong(song.id)} className="play-btn" style={{ marginLeft: '8px' }} aria-label={t('music.like')}>
                              ❤️
                            </button>

                            {/* Bookmark — same pattern as the playlist
                                detail view (line ~600). Tapping toggles
                                the per-user bookmark via the shared
                                BookmarksContext; the icon swaps between
                                filled and outlined to reflect state.
                                Bookmarks are per-user so this only shows
                                to authenticated users. */}
                            {user && (
                              <button
                                onClick={() => toggleBm('music', song.id)}
                                className={`play-btn ${isBm('music', song.id) ? 'bookmark-active' : ''}`}
                                style={{ marginLeft: '8px' }}
                                title={isBm('music', song.id) ? t('music.unbookmark') : t('music.bookmark')}
                                aria-label={isBm('music', song.id) ? t('music.unbookmark') : t('music.bookmark')}
                                aria-pressed={isBm('music', song.id)}
                              >
                                {isBm('music', song.id) ? '🔖' : '⚪'}
                              </button>
                            )}

                            {/* Dropdown Popover để thêm vào Playlist */}
                            {user && (
                              <div className="playlist-popover-container" style={{ position: 'relative', marginLeft: '8px' }}>
                                <button
                                  className="play-btn add-to-playlist-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePopoverSongId(activePopoverSongId === song.id ? null : song.id);
                                  }}
                                  title={t('music.addToPlaylist')}
                                >
                                  <img
                                    src="/add-to-playlist-icon.png"
                                    alt={t('music.addToPlaylist')}
                                    style={{ width: '22px', height: '22px', verticalAlign: 'middle' }}
                                  />
                                </button>
                                {activePopoverSongId === song.id && (
                                  <div className="playlist-popover">
                                    <div className="popover-header">{t('music.popoverTitle')}</div>
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
                                        <div className="popover-empty">{t('music.popoverEmpty')}</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {isAdmin && (
                              <button 
                                onClick={() => handleDeleteSong(song.id)} 
                                className="play-btn delete-song-btn" 
                                style={{ marginLeft: '8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                                title={t('music.deleteSong')}
                              >
                                <img
                                  src="/delete-song-icon.png"
                                  alt={t('music.deleteSong')}
                                  style={{ width: '22px', height: '22px', verticalAlign: 'middle' }}
                                />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {!loading && songs.length === 0 && (
                    <p className="music-empty-text">{t('music.noSongData')}</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Thẻ audio ẩn điều khiển âm thanh (luôn mount trong DOM để không bị trễ/lỗi Autoplay) */}
      <audio
        ref={audioRef}
        src={currentSong ? getFullAudioUrl(currentSong.file_url) : undefined}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onAudioEnded}
        onError={(e) => {
          if (currentSong) {
            console.error('Audio playback error for URL:', currentSong.file_url, e);
            setIsPlaying(false);
          }
        }}
      />

      {/* Thanh phát nhạc nổi ở cuối trang */}
      {currentSong && (
        <div className="audio-player-bar">
          <div className="player-info">
            <h4>{currentSong.title}</h4>
            <p>{currentSong.artist}</p>
          </div>

          <div className="player-controls">
            <div className="controls-buttons">
              <button className="player-btn" onClick={handlePrevSong} aria-label={t('music.prev')}>⏮️</button>
              <button className="player-btn play-pause" onClick={togglePlayPause}>
                {isPlaying ? (
                  '⏸️'
                ) : (
                  <img
                    src="/play-icon.png"
                    alt={t('music.play')}
                    style={{ width: '24px', height: '24px', verticalAlign: 'middle' }}
                  />
                )}
              </button>
              <button className="player-btn" onClick={handleNextSong} aria-label={t('music.next')}>⏭️</button>
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
              <h2>{t('music.uploadHeading')}</h2>
              <button className="music-close-btn" onClick={() => !isUploading && setShowUploadModal(false)}>×</button>
            </div>
            <form onSubmit={handleUploadSubmit} className="music-modal-body">
              <div className="music-form-group">
                <label>{t('music.songTitleLabel')} *</label>
                <input
                  type="text"
                  placeholder={t('music.ph.songTitle')}
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  disabled={isUploading}
                  required
                />
              </div>

              <div className="music-form-group">
                <label>{t('music.artistLabel')}</label>
                <input
                  type="text"
                  placeholder={t('music.ph.artist')}
                  value={uploadForm.artist}
                  onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}
                  disabled={isUploading}
                />
              </div>

              <div className="music-form-group">
                <label>{t('music.genreLabel')}</label>
                <select
                  value={uploadForm.genre}
                  onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })}
                  disabled={isUploading}
                >
                  <option value="Update later">{t('music.genreUnknown')}</option>
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
                <label>{t('music.durationLabel')}</label>
                <input
                  type="text"
                  value={uploadForm.duration}
                  onChange={(e) => setUploadForm({ ...uploadForm, duration: e.target.value })}
                  disabled={isUploading}
                  placeholder="00:00"
                />
              </div>

              <div className="music-form-group">
                <label>{t('music.fileLabel')} *</label>
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
                    <span>{t('music.uploading')}</span>
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="music-submit-btn"
                  disabled={isUploading}
                >
                  {isUploading ? t('music.processing') : t('music.uploadAndSave')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tạo Playlist (dành cho mọi User đăng nhập) */}
      {showCreatePlaylistModal && (
        <div className="music-modal-overlay">
          <div className="music-modal-content">
            <div className="music-modal-header">
              <h2 className="music-modal-title">{t('music.createPlaylistHeading')}</h2>
              <button className="music-close-btn" onClick={() => setShowCreatePlaylistModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreatePlaylistSubmit} className="music-modal-body">
              <div className="music-form-group">
                <label>{t('music.playlistNameLabel')} *</label>
                <input
                  type="text"
                  placeholder={t('music.ph.playlistName')}
                  value={newPlaylistForm.name}
                  onChange={(e) => setNewPlaylistForm({ ...newPlaylistForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="music-form-group">
                <label>{t('music.playlistDescLabel')}</label>
                <input
                  type="text"
                  placeholder={t('music.ph.playlistDesc')}
                  value={newPlaylistForm.description}
                  onChange={(e) => setNewPlaylistForm({ ...newPlaylistForm, description: e.target.value })}
                />
              </div>

              <div className="music-form-group">
                <label>{t('music.playlistIconLabel')} *</label>
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="music-submit-btn"
                  style={{ backgroundColor: '#8b5cf6' }}
                >
                  {t('music.createNew')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}