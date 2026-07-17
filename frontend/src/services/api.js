import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 15000,
  // Send the fw_auth httpOnly cookie on every same-origin request.
  // Without this the browser drops the cookie on cross-origin XHR.
  withCredentials: true,
});

// No more Authorization / X-Auth-Token injection from JS — the
// server sets the cookie on /auth/login and the browser auto-attaches
// it. JS code (including any injected XSS payload) cannot read the
// cookie because it is HttpOnly, so the XSS-token-theft path is
// closed. We keep the localStorage 'token' clear-on-401 below for
// any leftover keys from the old flow.

// Auto-logout on 401 (expired/invalid token). The previous version
// did `window.location.href = '/'` to force-clear the in-memory user
// state — but that creates a reload loop: the freshly-reloaded App
// calls /auth/me again, gets 401 again, reloads again. The newer
// version lets App.jsx's render gate (it renders <Login/> when
// user is null) handle the transition by dispatching a
// `auth:session-expired` CustomEvent that App.jsx listens to.
//
// We gate on a one-shot `handled` flag so multiple concurrent
// 401s (e.g. Knowledge + Feed + Bookmarks fetch all firing at once
// on app mount) don't race on the same handler.
let handled401 = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && !handled401) {
      handled401 = true;
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch (err) {
        console.warn('[auth] Failed to clear localStorage on 401', err);
      }
      // Tell the app shell that the session ended. App.jsx listens
      // for this and calls setUser(null) + handleLogout, which
      // re-renders the Login screen without a page reload.
      try {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      } catch (err) {
        console.warn('[auth] Failed to dispatch session-expired event', err);
      }
      // Reset the flag on the next tick so a future legitimate
      // session-expiry 401 (after a real login) can still trigger
      // cleanup. Without this the flag would stick for the life of
      // the page and silently swallow real expiry events.
      setTimeout(() => { handled401 = false; }, 1000);
    }
    return Promise.reject(error);
  }
);

// ==================== Face Recognition ====================
export const fetchUsers = (page = 1, limit = 10) => api.get('/users', { params: { page, limit } });

export const fetchUserProfile = (userId) =>
  api.get(`/users/${userId}/profile`).then((r) => r.data);

// ==================== Follow ====================
//
// Mirrors the toggle pattern used by bookmarks: POST turns the edge
// on (idempotent — re-following returns the same payload as a fresh
// follow), DELETE turns it off. The response includes `is_following`
// plus the new follower/following counts so the FE can update both
// the button label and the count display in a single round-trip.

export const followUser = (userId) =>
  api.post(`/users/${userId}/follow`).then((r) => r.data);

export const unfollowUser = (userId) =>
  api.delete(`/users/${userId}/follow`).then((r) => r.data);

export const fetchFollowers = (userId, limit = 50, offset = 0) =>
  api.get(`/users/${userId}/followers`, { params: { limit, offset } }).then((r) => r.data);

export const fetchFollowing = (userId, limit = 50, offset = 0) =>
  api.get(`/users/${userId}/following`, { params: { limit, offset } }).then((r) => r.data);


// ==================== Collections ====================
//
// User-curated reading lists of knowledge articles. All endpoints are
// auth-required (collections are private). The FE loads the list page
// on demand and the detail page on /collections/:id.

export const fetchMyCollections = () =>
  api.get('/collections').then((r) => r.data?.items || []);

export const createCollectionApi = (payload) =>
  api.post('/collections', payload).then((r) => r.data);

export const fetchCollectionDetail = (collectionId) =>
  api.get(`/collections/${collectionId}`).then((r) => r.data);

export const updateCollectionApi = (collectionId, payload) =>
  api.patch(`/collections/${collectionId}`, payload).then((r) => r.data);

export const deleteCollectionApi = (collectionId) =>
  api.delete(`/collections/${collectionId}`).then((r) => r.data);

export const addItemToCollection = (collectionId, contentType, contentId) =>
  api.post(`/collections/${collectionId}/items`, { content_type: contentType, content_id: contentId })
    .then((r) => r.data);

export const removeItemFromCollection = (collectionId, contentType, contentId) =>
  api.delete(`/collections/${collectionId}/items`, { data: { content_type: contentType, content_id: contentId } })
    .then((r) => r.data);


// ==================== Tags ====================
//
// Shared global vocabulary across knowledge + posts. The autocomplete
// endpoint is public; attach/detach are auth-required.
//
// `tags` field on Knowledge/Post response rows is the denormalized
// list — the FE renders chips from it directly, no follow-up GET
// needed.

export const searchTags = (q, limit = 20) =>
  api.get('/tags', { params: { q, limit } }).then((r) => r.data?.items || []);

export const attachTags = (contentType, contentId, names) =>
  api.post(`/tags/attach`, { names }, { params: { content_type: contentType, content_id: contentId } })
    .then((r) => r.data);

export const detachTag = (contentType, contentId, name) =>
  api.post(`/tags/detach`, null, { params: { content_type: contentType, content_id: contentId, name } })
    .then((r) => r.data);

export const fetchLogs = () => api.get('/logs');

export const recognizeFace = (imageBase64) => api.post('/recognize', { image_base64: imageBase64 });

export const enrollUser = (payload) => api.post('/users', payload);


// ==================== Authentication ====================
//
// Login now relies on the BE setting the fw_auth httpOnly cookie.
// The FE never sees the JWT, so an XSS payload can't read it out.
// /auth/me rebuilds the user object on page reload (replacing the
// old localStorage 'user' read).

export const loginWithPassword = (usernameOrEmail, password) =>
  api.post('/auth/login', { username_or_email: usernameOrEmail, password });

export const loginWithFace = (imageBase64) =>
  api.post('/auth/login-face', { image_base64: imageBase64 });

export const logout = () => api.post('/auth/logout');

export const fetchMe = () => api.get('/auth/me').then((r) => r.data);

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


// ==================== Personal Dashboard ====================
//
// These three endpoints power the Home tab. The view/like/play
// endpoints above already write activity events server-side as a
// side effect; the only place that needs an explicit track call is
// when a user opens content from a link that bypasses the natural
// counter endpoint (e.g. deep-link to /knowledge/{id} from Feed).

export const trackActivity = (payload) => api.post('/activity/track', payload);

export const fetchMyInsights = (days = 7) =>
  api.get('/me/insights', { params: { days } }).then((r) => r.data);

// Download the user's insights as a file. The BE sets
// Content-Disposition so the browser pops a save dialog; we
// forward the same filename from the response header so the
// default name in that dialog matches what we'd compute.
export const exportMyInsights = async (days = 7, fmt = 'csv') => {
  const res = await api.get('/me/insights/export', {
    params: { days, fmt },
    responseType: 'blob',
  });
  // Content-Disposition: attachment; filename="..." → grab the
  // quoted filename, fall back to a generic name if the header
  // is missing (e.g. when the BE was patched and forgot it).
  const disp = res.headers?.['content-disposition'] || '';
  const match = /filename="([^"]+)"/.exec(disp);
  const filename = match ? match[1] : `favweb-insights-${days}d.${fmt}`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const fetchRecentActivity = (limit = 10) =>
  api.get('/me/recent-activity', { params: { limit } }).then((r) => r.data || []);


// ==================== Global Search ====================
//
// Single cross-content search endpoint. `types` is an array filter
// (defaults to knowledge/music/game on the BE; user is admin-only).
// Returns the BE's grouped payload directly — the FE merges the
// results into the SearchBar dropdown.

export const globalSearch = (q, types) =>
  api.get('/search', { params: { q, types: types?.join(',') } }).then((r) => r.data);


// ==================== Comments + Reactions ====================
//
// Shared between Knowledge articles and Feed posts. The FE picks the
// content_type when wiring these into a CommentSection; the BE's
// polymorphic table handles both kinds behind one set of routes.

export const fetchComments = (contentType, contentId) =>
  api.get('/comments', { params: { content_type: contentType, content_id: contentId } }).then((r) => r.data);

export const createComment = (payload) => api.post('/comments', payload).then((r) => r.data);

export const updateComment = (commentId, body) =>
  api.patch(`/comments/${commentId}`, { body }).then((r) => r.data);

export const deleteCommentApi = (commentId) => api.delete(`/comments/${commentId}`).then((r) => r.data);

export const fetchReactions = (contentType, contentId) =>
  api.get('/reactions', { params: { content_type: contentType, content_id: contentId } }).then((r) => r.data);

export const toggleReaction = (payload) => api.post('/reactions', payload).then((r) => r.data);


// ==================== Notifications ====================
//
// The bell badge polls /notifications/unread-count every 30s, and
// the dropdown fetches /notifications lazily when the user clicks
// the bell. Mark-one / mark-all use POST so retries are idempotent.

export const fetchNotifications = (unreadOnly = false, limit = 20) =>
  api.get('/notifications', { params: { unread_only: unreadOnly, limit } }).then((r) => r.data);

export const fetchUnreadCount = () =>
  api.get('/notifications/unread-count').then((r) => r.data?.count ?? 0);

export const markNotificationRead = (id) =>
  api.post(`/notifications/${id}/read`).then((r) => r.data);

export const markAllNotificationsRead = () =>
  api.post('/notifications/read-all').then((r) => r.data?.updated ?? 0);


// ==================== Bookmarks ====================
//
// Toggle is optimistic-friendly: returns the new state so the FE can
// flip the 🔖 icon without a follow-up read. `fetchBookmarkIds` is
// called once on app mount to seed the in-memory "is this bookmarked?"
// set used by Knowledge and Feed cards.

export const toggleBookmark = (contentType, contentId) =>
  api.post('/bookmarks/toggle', { content_type: contentType, content_id: contentId }).then((r) => r.data);

export const fetchBookmarks = (contentType = null, limit = 100) =>
  api.get('/bookmarks', { params: { content_type: contentType, limit } }).then((r) => r.data);

export const fetchBookmarkIds = (contentType = null) =>
  api.get('/bookmarks/ids', { params: { content_type: contentType } }).then((r) => r.data?.items ?? []);

export const removeBookmark = (contentType, contentId) =>
  api.delete('/bookmarks', { params: { content_type: contentType, content_id: contentId } }).then((r) => r.data);


export default api;
