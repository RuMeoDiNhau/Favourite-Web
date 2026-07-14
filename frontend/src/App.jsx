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
import * as api from './services/api';

// Map view name <-> URL path so the navbar becomes bookmarkable and
// back/forward works. `home` is the Personal Dashboard (the new
// landing view); `feed` is the unified posts feed. Admin views stay
// hidden until role check.
const VIEW_PATHS = ['/home', '/feed', '/dashboard', '/users', '/logs', '/games', '/music', '/knowledge'];
const VIEW_NAMES = ['home', 'feed', 'dashboard', 'users', 'logs', 'games', 'music', 'knowledge'];

const pathToView = (pathname) => {
  // Backwards-compat: a stale bookmark at '/' used to mean the Feed.
  // After we added Home, the landing page became /home and the Feed
  // moved to /feed. If someone hits '/' we still want them to land
  // on the new Home view, not a broken empty Feed. /feed still
  // works explicitly for those who bookmarked it.
  if (pathname === '/') return 'home';
  const idx = VIEW_PATHS.indexOf(pathname);
  return idx === -1 ? 'home' : VIEW_NAMES[idx];
};

const viewToPath = (viewName) => {
  const idx = VIEW_NAMES.indexOf(viewName);
  return idx === -1 ? '/' : VIEW_PATHS[idx];
};

function App() {
  // `user` lives in React state only (not localStorage). The BE
  // sets the auth cookie; on page reload we rebuild this object
  // via /auth/me. The old localStorage pattern was a second
  // XSS-stealable piece of data — now gone.
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setViewRaw] = useState(() => pathToView(window.location.pathname));
  const [showPostModal, setShowPostModal] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [showFaceSetup, setShowFaceSetup] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // IDs the search results want to deep-open into a modal on the
  // target page (knowledge article / game detail). Reset after the
  // target view consumes them so a later manual nav doesn't reopen.
  const [searchOpenKnowledgeId, setSearchOpenKnowledgeId] = useState(null);
  const [searchOpenGameId, setSearchOpenGameId] = useState(null);

  // On first mount, ask the BE "who am I?". The fw_auth cookie (if
  // present) makes this succeed; if not, we render Login.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        // 401 etc. — no session.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Wrap setView so clicking a nav button also updates the URL. We use
  // pushState (not replaceState) so each tab becomes a history entry
  // and the browser back/forward buttons cycle through them.
  const setView = useCallback((next) => {
    setViewRaw(next);
    const nextPath = viewToPath(next);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setMobileMenuOpen(false);
  }, []);

  // Browser back/forward: popstate fires with the new location. Sync state
  // without re-pushing (we already navigated).
  useEffect(() => {
    const onPop = () => setViewRaw(pathToView(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Khởi tạo trạng thái giao diện sáng/tối từ localStorage
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
    // (offline), we still drop the local user state — the cookie
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

  // SearchBar click → navigate to the matching view and, when the
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

  // Notification click → navigate to the matching view. For Knowledge
  // notifications we deep-open the article modal; for Post we open
  // the Feed (no per-post modal exists today — Feed itself is the
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

  // Nếu chưa đăng nhập, chỉ hiển thị màn hình Login
  if (!authChecked) {
    // Brief moment while /auth/me is in flight. Render nothing
    // rather than flash the Login screen — that's a small UX win
    // for users on slow connections.
    return null;
  }
  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  // Single source of truth for nav items so desktop <nav> and mobile drawer
  // can't drift. `adminOnly` is gated against the current user's role.
  const NAV_ITEMS = [
    { name: 'home', label: '🏠 Trang chủ' },
    { name: 'feed', label: '📰 Bảng tin' },
    { name: 'dashboard', label: '📷 Quét khuôn mặt' },
    { name: 'users', label: '👥 Users', adminOnly: true },
    { name: 'logs', label: '📋 Logs', adminOnly: true },
    { name: 'games', label: '🎮 Games' },
    { name: 'music', label: '🎵 Music' },
    { name: 'knowledge', label: '📚 Knowledge' },
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
    <div className={`App ${isDarkMode ? 'dark-theme' : ''}`}>
      <header className="main-navbar">
        <div className="navbar-left">
          <div className="navbar-logo">
            <span className="logo-icon">🌐</span>
            <span className="logo-text">Fav Web</span>
          </div>
          <SearchBar
            onSelectItem={handleSearchSelect}
            isAdmin={user.role === 'admin'}
          />
        </div>

        <nav className="navbar-center">
          {visibleNav.map(renderNavButton)}
        </nav>

        <div className="navbar-right">
          <NotificationBell onSelectItem={handleNotificationSelect} />

          {/* Nút bật/tắt chế độ sáng/tối */}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDarkMode ? "Chuyển sang Chế độ sáng" : "Chuyển sang Chế độ tối"}
          >
            {isDarkMode ? '☀️ Sáng' : '🌙 Tối'}
          </button>

          <div className="user-profile-dropdown">
            {user.avatar_url ? (
              <img 
                src={getFullAssetUrl(user.avatar_url)} 
                alt="Avatar" 
                className="avatar-circle" 
                style={{ objectFit: 'cover', border: '2px solid var(--primary-color, #6366f1)' }} 
              />
            ) : (
              <div className="avatar-circle">{user.name.substring(0, 2).toUpperCase()}</div>
            )}
            <span className="username-text">{user.name} ({user.role})</span>
            <span className="chevron-icon">▼</span>
          </div>
          <button className="create-post-nav-btn" onClick={() => setShowPostModal(true)}>
            <img 
              src="/create-post-icon.png" 
              alt="Create Post" 
              style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', filter: 'brightness(0) invert(1)' }} 
            />
            Đăng bài
          </button>
          <button className="logout-icon-btn" onClick={handleLogout} title="Đăng xuất">
            <img
              src="/logout-icon.png"
              alt="Logout"
              className="logout-btn-icon-img"
              style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}
            />
            Đăng xuất
          </button>

          {/* Hamburger toggle — only meaningful on mobile (CSS hides on desktop). */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile drawer. CSS shows this only below 900px and hides the desktop
            <nav> at the same breakpoint, so on desktop the drawer is invisible.
            Click on the overlay closes it. */}
        {mobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)} />
        )}
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <nav className="mobile-menu-nav">
            {visibleNav.map(renderNavButton)}
          </nav>
        </div>
      </header>

      {/* Banner kích hoạt Face ID nếu user chưa đăng ký khuôn mặt */}
      {(!user.registered_images || user.registered_images === 0) && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(99,102,241,0.15) 0%, rgba(79,70,229,0.1) 100%)',
          borderBottom: '1px solid rgba(99,102,241,0.25)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🔐</span>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#a5b4fc' }}>
                Bạn chưa kích hoạt Face ID.
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: '8px' }}>
                Đăng ký khuôn mặt để đăng nhập nhanh hơn bằng camera.
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowFaceSetup(true)}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 12px rgba(99,102,241,0.4)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            📷 Kích hoạt Face ID ngay
          </button>
        </div>
      )}

      <main>
        {view === 'home' && <Home onNavigate={setView} />}
        {view === 'feed' && <Feed key={feedKey} currentUser={user} />}
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
          />
        )}
      </main>

      {showPostModal && (
        <PostModal 
          onClose={() => setShowPostModal(false)} 
          onPostCreated={() => setFeedKey(prev => prev + 1)}
        />
      )}

      {showFaceSetup && (
        <FaceSetupModal
          onClose={() => setShowFaceSetup(false)}
          onSuccess={(data) => {
            // Cập nhật user trong localStorage để không hiện banner nữa
            const updated = { ...user, registered_images: data.data?.total_registered_images || 1 };
            localStorage.setItem('user', JSON.stringify(updated));
            setUser(updated);
            setShowFaceSetup(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
