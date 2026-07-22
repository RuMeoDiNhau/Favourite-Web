import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Logs from './pages/Logs';
import Games from './pages/Games';
import Music from './pages/Music';
import Knowledge from './pages/Knowledge';
import Login from './pages/Login/Login';
import Feed from './pages/Feed/Feed';
import Home from './pages/Home';
import PostModal from './pages/Feed/PostModal';
import FaceSetupModal from './components/FaceSetupModal';
import SearchBar from './components/SearchBar';
import NotificationBell from './components/NotificationBell';
import Bookmarks from './pages/Bookmarks';
import UserProfile from './pages/UserProfile';
import Collections from './pages/Collections/Collections';
import CollectionDetail from './pages/Collections/CollectionDetail';
import { BookmarksProvider } from './lib/BookmarksContext';
import * as api from './services/api';

// Map view name <-> URL path so the navbar becomes bookmarkable and
// back/forward works. `home` is the Personal Dashboard (the new
// landing view); `feed` is the unified posts feed. Admin views stay
// hidden until role check.
const VIEW_PATHS = ['/home', '/feed', '/bookmarks', '/collections', '/dashboard', '/users', '/logs', '/games', '/music', '/knowledge'];
const VIEW_NAMES = ['home', 'feed', 'bookmarks', 'collections', 'dashboard', 'users', 'logs', 'games', 'music', 'knowledge'];

// Detail routes are nested under a top-level view, e.g.
// '/users/<id>' renders the same shell as '/users' but with the
// detail prop set so the page knows which user to show. Keeping
// the detail id in the URL (not React state) means a profile link
// can be shared / bookmarked.
const DETAIL_PATTERN = /^\/users\/([A-Za-z0-9._-]+)$/;
// Collection detail uses /collections/<id> â€” same pattern as the
// user profile. The id is an integer; we capture it directly.
const COLLECTION_DETAIL_PATTERN = /^\/collections\/(\d+)$/;

const pathToView = (pathname) => {
  // Backwards-compat: a stale bookmark at '/' used to mean the Feed.
  // After we added Home, the landing page became /home and the Feed
  // moved to /feed. If someone hits '/' we still want them to land
  // on the new Home view, not a broken empty Feed. /feed still
  // works explicitly for those who bookmarked it.
  if (pathname === '/') return 'home';
  if (DETAIL_PATTERN.test(pathname)) return 'userProfile';
  if (COLLECTION_DETAIL_PATTERN.test(pathname)) return 'collectionDetail';
  const idx = VIEW_PATHS.indexOf(pathname);
  return idx === -1 ? 'home' : VIEW_NAMES[idx];
};

const viewToPath = (viewName, detail) => {
  if (viewName === 'userProfile' && detail?.userId) return `/users/${detail.userId}`;
  if (viewName === 'collectionDetail' && detail?.id) return `/collections/${detail.id}`;
  const idx = VIEW_NAMES.indexOf(viewName);
  return idx === -1 ? '/' : VIEW_PATHS[idx];
};

function App() {
  // `user` lives in React state only (not localStorage). The BE
  // sets the auth cookie; on page reload we rebuild this object
  // via /auth/me. The old localStorage pattern was a second
  // XSS-stealable piece of data â€” now gone.
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setViewRaw] = useState(() => pathToView(window.location.pathname));
  const [showPostModal, setShowPostModal] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [showFaceSetup, setShowFaceSetup] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // IDs the search results want to deep-open into a modal on the
  // target page (knowledge article / game detail). Reset after the
  // target view consumes them so a later manual nav doesn't reopen.
  const [searchOpenKnowledgeId, setSearchOpenKnowledgeId] = useState(null);
  const [searchOpenGameId, setSearchOpenGameId] = useState(null);
  // Detail-route payload. UserProfile uses the user_id, CollectionDetail
  // uses the collection id. Both are pulled from the URL on first
  // render and updated on popstate so back/forward keeps them in sync.
  const [profileUserId, setProfileUserId] = useState(() => {
    const m = DETAIL_PATTERN.exec(window.location.pathname);
    return m ? decodeURIComponent(m[1]) : null;
  });
  const [collectionId, setCollectionId] = useState(() => {
    const m = COLLECTION_DETAIL_PATTERN.exec(window.location.pathname);
    return m ? Number(m[1]) : null;
  });

  // On first mount, ask the BE "who am I?". The fw_auth cookie (if
  // present) makes this succeed; if not, we render Login.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        // 401 etc. â€” no session.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Listen for session-expiry 401s raised by the axios interceptor
  // (api.js). On expiry the cookie is gone but App still holds the
  // user object from /auth/me at mount, so the only way to force a
  // re-render into <Login/> is to clear that state here. We use a
  // CustomEvent (not a direct api.* call) so this file stays the
  // single source of truth for auth-state transitions.
  useEffect(() => {
    const onExpired = () => handleLogout();
    window.addEventListener('auth:session-expired', onExpired);
    return () => window.removeEventListener('auth:session-expired', onExpired);
    // handleLogout is stable for this component's lifetime â€” listing
    // it in deps would cause a re-bind on every render that closes
    // over a different `user`, which is the opposite of what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wrap setView so clicking a nav button also updates the URL. We use
  // pushState (not replaceState) so each tab becomes a history entry
  // and the browser back/forward buttons cycle through them.
  //
  // The `detail` optional argument carries per-view payload:
  //   { userId } for 'userProfile'
  //   { id }     for 'collectionDetail'
  // Passing nothing falls back to the existing detail state, so
  // navigating to a detail view without an id is treated as a
  // request to revisit the previously-shown record.
  const setView = useCallback((next, detail) => {
    setViewRaw(next);
    if (next === 'userProfile') {
      const nextId = detail?.userId ?? profileUserId;
      if (nextId) setProfileUserId(nextId);
    } else if (next === 'collectionDetail') {
      const nextId = detail?.id ?? collectionId;
      if (nextId) setCollectionId(nextId);
    }
    const payload = next === 'userProfile'
      ? (detail?.userId ?? profileUserId)
      : next === 'collectionDetail'
        ? (detail?.id ?? collectionId)
        : undefined;
    const nextPath = viewToPath(next, payload ? { userId: next === 'userProfile' ? payload : undefined, id: next === 'collectionDetail' ? payload : undefined } : undefined);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setMobileMenuOpen(false);
  }, [profileUserId, collectionId]);

  // Browser back/forward: popstate fires with the new location. Sync state
  // without re-pushing (we already navigated). When the path now
  // points at a detail view, refresh the detail id so the page shows
  // the right record.
  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname;
      setViewRaw(pathToView(p));
      const m = DETAIL_PATTERN.exec(p);
      if (m) setProfileUserId(decodeURIComponent(m[1]));
      const cm = COLLECTION_DETAIL_PATTERN.exec(p);
      if (cm) setCollectionId(Number(cm[1]));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Khá»Ÿi táº¡o tráº¡ng thÃ¡i giao diá»‡n sÃ¡ng/tá»‘i tá»« localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const getFullAssetUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api/v1', '') 
      : 'http://localhost:8000';
    return `${base}${url}`;
  };

  const handleLogout = async () => {
    // Tell the BE to clear the cookie. Even if the request fails
    // (offline), we still drop the local user state â€” the cookie
    // will expire on its own within 7 days.
    try {
      await api.logout();
    } catch (err) {
      console.warn('[auth] logout request failed', err);
    }
    // Drop any leftover legacy keys from the old localStorage flow.
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } catch (err) {
      console.warn('[auth] failed to clear localStorage', err);
    }
    setUser(null);
  };

  // SearchBar click â†’ navigate to the matching view and, when the
  // type has a detail modal (knowledge/game), request it to open
  // the right item. The per-view "consumed" callbacks clear the
  // pending id so navigation between manual tabs doesn't reopen.
  const handleSearchSelect = useCallback((item, type) => {
    if (type === 'knowledge') {
      setSearchOpenKnowledgeId(item.id);
      setSearchOpenGameId(null);
      setView('knowledge');
    } else if (type === 'music') {
      setSearchOpenKnowledgeId(null);
      setSearchOpenGameId(null);
      setView('music');
    } else if (type === 'game') {
      setSearchOpenGameId(item.id);
      setSearchOpenKnowledgeId(null);
      setView('games');
    } else if (type === 'user') {
      setSearchOpenKnowledgeId(null);
      setSearchOpenGameId(null);
      setView('users');
    }
  }, []);

  const consumeSearchOpenKnowledge = useCallback(() => setSearchOpenKnowledgeId(null), []);
  const consumeSearchOpenGame = useCallback(() => setSearchOpenGameId(null), []);

  // Notification click â†’ navigate to the matching view. For Knowledge
  // notifications we deep-open the article modal; for Post we open
  // the Feed (no per-post modal exists today â€” Feed itself is the
  // destination). Unknown content types land on home.
  const handleNotificationSelect = useCallback((n) => {
    if (n.content_type === 'knowledge' && n.content_id) {
      setSearchOpenKnowledgeId(n.content_id);
      setSearchOpenGameId(null);
      setView('knowledge');
    } else if (n.content_type === 'post') {
      setSearchOpenKnowledgeId(null);
      setSearchOpenGameId(null);
      setView('feed');
    } else {
      setSearchOpenKnowledgeId(null);
      setSearchOpenGameId(null);
      setView('home');
    }
  }, []);

  // Náº¿u chÆ°a Ä‘Äƒng nháº­p, chá»‰ hiá»ƒn thá»‹ mÃ n hÃ¬nh Login
  if (!authChecked) {
    // Brief moment while /auth/me is in flight. Render nothing
    // rather than flash the Login screen â€” that's a small UX win
    // for users on slow connections.
    return null;
  }
  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  // Single source of truth for nav items so desktop <nav> and mobile drawer
  // can't drift. `adminOnly` is gated against the current user's role.
  const NAV_ITEMS = [
    { name: 'home',        icon: '🏠', label: 'Trang chủ' },
    { name: 'feed',        icon: '📰', label: 'Bảng tin' },
    { name: 'bookmarks',   icon: '🔖', label: 'Đã lưu' },
    { name: 'collections', icon: '📂', label: 'Bộ sưu tập' },
    { name: 'dashboard',   icon: '📷', label: 'Quét khuôn mặt' },
    { name: 'users',       icon: '👥', label: 'Users', adminOnly: true },
    { name: 'logs',        icon: '📋', label: 'Logs',  adminOnly: true },
    { name: 'games',       icon: '🎮', label: 'Games' },
    { name: 'music',       icon: '🎵', label: 'Music' },
    { name: 'knowledge',   icon: '📚', label: 'Knowledge' },
  ];
  const visibleNav = NAV_ITEMS.filter((it) => !it.adminOnly || user.role === 'admin');

  const renderNavButton = (item) => (
    <button
      key={item.name}
      className={view === item.name ? 'active' : ''}
      onClick={() => setView(item.name)}
    >
      {item.label}
    </button>
  );

  return (
    <BookmarksProvider>
      <div className={`App ${isDarkMode ? 'dark-theme' : ''}`}>
        <div className="app-shell">

          {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
              SIDEBAR (fixed left column)
              ════════════════════════════════════════════════════════════════ */}
          <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>

            {/* Logo + Search */}
            <div className="sidebar-header">
              <div className="sidebar-logo" onClick={() => window.location.href = '/'}>
                <span className="sidebar-logo-icon">🌐</span>
                <span className="sidebar-logo-text">Fav Web</span>
              </div>
              <div className="sidebar-search">
                <SearchBar
                  onSelectItem={handleSearchSelect}
                  isAdmin={user.role === 'admin'}
                  userId={user.user_id}
                />
              </div>
            </div>

            {/* Navigation menu */}
            <nav className="sidebar-nav">
              {visibleNav.map((item) => (
                <button
                  key={item.name}
                  className={`sidebar-nav-item${view === item.name ? ' active' : ''}`}
                  onClick={() => { setView(item.name); setSidebarOpen(false); }}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Bottom: Post button + User profile */}
            <div className="sidebar-bottom">
              <button
                className="sidebar-post-btn"
                onClick={() => setShowPostModal(true)}
              >
                ✏️ Đăng bài mới
              </button>

              <div className="sidebar-user">
                {user.avatar_url ? (
                  <img
                    src={getFullAssetUrl(user.avatar_url)}
                    alt="Avatar"
                    className="sidebar-avatar"
                  />
                ) : (
                  <div className="sidebar-avatar">
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="sidebar-user-info">
                  <div className="sidebar-username">{user.name}</div>
                  <div className="sidebar-role">{user.role}</div>
                </div>
                <button
                  className="sidebar-logout-btn"
                  onClick={handleLogout}
                  title="Đăng xuất"
                >
                  ⏻
                </button>
              </div>
            </div>
          </aside>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div
              className="mobile-overlay visible"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              MAIN AREA (right of sidebar)
              â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="main-area">

            {/* Slim top header */}
            <header className="top-header">
              <div className="top-header-left">
                <button
                  className="sidebar-collapse-btn"
                  onClick={() => setSidebarOpen((v) => !v)}
                  title="Toggle sidebar"
                >
                  â˜°
                </button>
              </div>
              <div className="top-header-right">
                <NotificationBell onSelectItem={handleNotificationSelect} />
                <button
                  className="theme-toggle-btn"
                  onClick={toggleTheme}
                  title={isDarkMode ? 'Chuyá»ƒn sang Cháº¿ Ä‘á»™ sÃ¡ng' : 'Chuyá»ƒn sang Cháº¿ Ä‘á»™ tá»‘i'}
                >
                  {isDarkMode ? 'â˜€ï¸ SÃ¡ng' : 'ðŸŒ™ Tá»‘i'}
                </button>
              </div>
            </header>

            {/* Face ID activation banner */}
            {(!user.registered_images || user.registered_images === 0) && (
              <div className="face-id-banner">
                <div className="face-id-banner-inner">
                  <span style={{ fontSize: '18px' }}>ðŸ”</span>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#a5b4fc' }}>
                      Báº¡n chÆ°a kÃ­ch hoáº¡t Face ID.
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: '8px' }}>
                      ÄÄƒng kÃ½ khuÃ´n máº·t Ä‘á»ƒ Ä‘Äƒng nháº­p nhanh hÆ¡n báº±ng camera.
                    </span>
                  </div>
                </div>
                <button
                  className="face-id-activate-btn"
                  onClick={() => setShowFaceSetup(true)}
                >
                  ðŸ“· KÃ­ch hoáº¡t Face ID ngay
                </button>
              </div>
            )}

            {/* Page content */}
            <main>
              {view === 'home' && <Home onNavigate={setView} />}
              {view === 'feed' && <Feed key={feedKey} currentUser={user} onNavigate={setView} />}
              {view === 'bookmarks' && <Bookmarks onNavigate={setView} />}
              {view === 'collections' && <Collections onNavigate={setView} />}
              {view === 'collectionDetail' && collectionId && (
                <CollectionDetail collectionId={collectionId} onNavigate={setView} />
              )}
              {view === 'dashboard' && <Dashboard />}
              {view === 'users' && user?.role === 'admin' && <Users />}
              {view === 'logs' && user?.role === 'admin' && <Logs />}
              {view === 'games' && (
                <Games
                  searchOpenGameId={searchOpenGameId}
                  onConsumeSearchOpen={consumeSearchOpenGame}
                />
              )}
              {view === 'music' && <Music />}
              {view === 'knowledge' && (
                <Knowledge
                  searchOpenKnowledgeId={searchOpenKnowledgeId}
                  onConsumeSearchOpen={consumeSearchOpenKnowledge}
                  currentUser={user}
                  onNavigate={setView}
                />
              )}
              {view === 'userProfile' && profileUserId && (
                <UserProfile
                  userId={profileUserId}
                  currentUser={user}
                  onNavigate={setView}
                />
              )}
            </main>
          </div>
        </div>

        {/* â”€â”€ Modals â”€â”€ */}
        {showPostModal && (
          <PostModal
            onClose={() => setShowPostModal(false)}
            onPostCreated={() => setFeedKey((prev) => prev + 1)}
          />
        )}

        {showFaceSetup && (
          <FaceSetupModal
            onClose={() => setShowFaceSetup(false)}
            onSuccess={(data) => {
              const updated = { ...user, registered_images: data.data?.total_registered_images || 1 };
              localStorage.setItem('user', JSON.stringify(updated));
              setUser(updated);
              setShowFaceSetup(false);
            }}
          />
        )}
      </div>
    </BookmarksProvider>
  );
}

export default App;
