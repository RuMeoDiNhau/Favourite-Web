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
    config.headers['X-User-Id'] = token; // Fallback compatibility
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

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

export const searchKnowledge = (query) => api.get(`/knowledge/search/${query}`);

export const fetchKnowledgeCategories = () => api.get('/knowledge/categories');


// ==================== Unified Posts ====================
export const fetchPosts = () => api.get('/posts');

export const createPost = (postData) => api.post('/posts', postData);

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
