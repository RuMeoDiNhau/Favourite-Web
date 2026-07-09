import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 15000,
});

// Auto attach JWT Authorization header if logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
    // Fallback for clients that cannot set Authorization (e.g. <img>/<audio>).
    // Renamed from the misleading `X-User-Id` to `X-Auth-Token` so the header
    // name reflects its actual payload (a JWT, not a numeric user id).
    config.headers['X-Auth-Token'] = token;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Auto-logout on 401 (expired/invalid token). A hard reload is the simplest
// way to clear the cached `user` state in App.jsx — the entire UI is gated on
// `user` (App.jsx renders Login when user is null).
let isHandling401 = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && !isHandling401) {
      isHandling401 = true;
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch (err) {
        console.warn('[auth] Failed to clear localStorage on 401', err);
      } finally {
        window.location.href = '/';
        // Reset the flag after the reload completes; in practice this branch
        // never runs because window.location.href triggers a full reload.
        isHandling401 = false;
      }
    }
    return Promise.reject(error);
  }
);

// ==================== Face Recognition ====================
export const fetchUsers = (page = 1, limit = 10) => api.get('/users', { params: { page, limit } });

export const fetchLogs = () => api.get('/logs');

export const recognizeFace = (imageBase64) => api.post('/recognize', { image_base64: imageBase64 });

export const enrollUser = (payload) => api.post('/users', payload);


// ==================== Authentication ====================
export const loginWithPassword = (usernameOrEmail, password) => 
  api.post('/auth/login', { username_or_email: usernameOrEmail, password });

export const loginWithFace = (imageBase64) => 
  api.post('/auth/login-face', { image_base64: imageBase64 });

export const registerFace = (imagesBase64) =>
  api.post('/users/me/register-face', { images_base64: imagesBase64 });


// ==================== Games ====================
export const fetchGames = () => api.get('/games');

export const fetchGamesByCategory = (category) => api.get(`/games/category/${category}`);

export const fetchGame = (gameId) => api.get(`/games/${gameId}`);

export const createGame = (gameData) => api.post('/games', gameData);

export const viewGame = (gameId) => api.post(`/games/${gameId}/view`);

export const likeGame = (gameId) => api.post(`/games/${gameId}/like`);

export const fetchPopularGames = () => api.get('/games/popular/trending');

export const fetchNewGames = () => api.get('/games/new/latest');


// ==================== Music ====================
export const fetchPlaylists = () => api.get('/playlists');

export const fetchAllMusic = () => api.get('/music');

export const fetchMusicByGenre = (genre) => api.get(`/music/genre/${genre}`);

export const fetchSong = (songId) => api.get(`/music/${songId}`);

export const createSong = (songData) => api.post('/music', songData);

export const playSong = (songId) => api.post(`/music/${songId}/play`);

export const likeSong = (songId) => api.post(`/music/${songId}/like`);

export const fetchPopularSongs = () => api.get('/music/popular/trending');

export const fetchNewSongs = () => api.get('/music/new/latest');

export const deleteSong = (songId) => api.delete(`/music/${songId}`);

export const createPlaylist = (playlistData) => api.post('/playlists', playlistData);

export const deletePlaylist = (playlistId) => api.delete(`/playlists/${playlistId}`);

export const fetchSongsByPlaylist = (playlistId) => api.get(`/playlists/${playlistId}/songs`);

export const addSongToPlaylist = (playlistId, songId) => api.post(`/playlists/${playlistId}/songs/${songId}`);

export const removeSongFromPlaylist = (songId) => api.delete(`/playlists/songs/${songId}`);


// ==================== Knowledge ====================
export const fetchAllKnowledge = () => api.get('/knowledge');

export const fetchKnowledgeByCategory = (category) => api.get(`/knowledge/category/${category}`);

export const fetchArticle = (articleId) => api.get(`/knowledge/${articleId}`);

export const createArticle = (articleData) => api.post('/knowledge', articleData);

export const likeArticle = (articleId) => api.post(`/knowledge/${articleId}/like`);

export const fetchPopularArticles = () => api.get('/knowledge/popular/trending');

export const fetchTrendingArticles = () => api.get('/knowledge/trending/hot');

export const searchKnowledge = (query) =>
  api.get('/knowledge/search', { params: { q: query } });

export const fetchKnowledgeCategories = () => api.get('/knowledge/categories');

// Fetch related YouTube videos for an article. Returns an array (possibly
// empty) of {videoId, title, channel}. Backend returns 200 with empty list
// when YOUTUBE_API_KEY is missing or upstream search fails.
export const fetchArticleVideos = (articleId) =>
  api.get(`/knowledge/${articleId}/videos`).then((res) => res.data?.videos || []);


// ==================== Unified Posts ====================
export const fetchPosts = () => api.get('/posts');

export const createPost = (postData) => api.post('/posts', postData);

// Best-effort cleanup of an orphan post upload when the subsequent createPost
// fails. The backend currently does not expose a DELETE /posts/upload endpoint
// (TODO follow-up), so this helper suppresses 404/405 noise and only warns for
// unexpected failures (5xx, network). When the endpoint ships, the existing
// call site keeps working without changes.
export const deleteUploadedFile = async (mediaUrl) => {
  if (!mediaUrl) return;
  try {
    return await api.delete('/posts/upload', { params: { url: mediaUrl } });
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404 || status === 405 || status === 501) {
      // Endpoint not implemented yet — silent (the comment above tracks the
      // follow-up). Logging here would spam the console on every failed post.
      return;
    }
    console.warn('[cleanup] Failed to delete orphan upload', mediaUrl, err?.message);
  }
};

export const uploadPostFile = (file, postType, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('post_type', postType);

  return api.post('/posts/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
};

export default api;
