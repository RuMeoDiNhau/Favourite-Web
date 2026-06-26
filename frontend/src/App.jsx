import React, { useState } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Logs from './pages/Logs';
import Games from './pages/Games';
import Music from './pages/Music';
import Knowledge from './pages/Knowledge';
import Login from './pages/Login/Login';
import Feed from './pages/Feed/Feed';
import PostModal from './pages/Feed/PostModal';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState('feed');
  const [showPostModal, setShowPostModal] = useState(false);
  const [feedKey, setFeedKey] = useState(0);

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

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  // Nếu chưa đăng nhập, chỉ hiển thị màn hình Login
  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className={`App ${isDarkMode ? 'dark-theme' : ''}`}>
      <header className="main-navbar">
        <div className="navbar-left">
          <div className="navbar-logo">
            <span className="logo-icon">🌐</span>
            <span className="logo-text">Fav Web</span>
          </div>
        </div>
        
        <nav className="navbar-center">
          <button className={view === 'feed' ? 'active' : ''} onClick={() => setView('feed')}>
            📰 Bảng tin
          </button>
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
            📷 Quét khuôn mặt
          </button>
          {user && user.role === 'admin' && (
            <>
              <button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  stroke="#1e293b"
                  strokeWidth="1"
                  style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}
                >
                  <circle cx="4" cy="14" r="2.2" />
                  <path d="M4,16.5 C2.5,16.5 1.5,17.5 1.5,19.5 L1.5,24 L6.5,24 L6.5,19.5 C6.5,17.5 5.5,16.5 4,16.5 Z" />
                  
                  <circle cx="20" cy="14" r="2.2" />
                  <path d="M20,16.5 C18.5,16.5 17.5,17.5 17.5,19.5 L17.5,24 L22.5,24 L22.5,19.5 C22.5,17.5 21.5,16.5 20,16.5 Z" />

                  <circle cx="7" cy="12" r="2.5" />
                  <path d="M7,14.8 C5,14.8 3.5,16 3.5,18 L3.5,24 L10.5,24 L10.5,18 C10.5,16 9,14.8 7,14.8 Z" />

                  <circle cx="17" cy="12" r="2.5" />
                  <path d="M17,14.8 C15,14.8 13.5,16 13.5,18 L13.5,24 L20.5,24 L20.5,18 C20.5,16 19,14.8 17,14.8 Z" />

                  <circle cx="9.5" cy="10" r="2.8" />
                  <path d="M9.5,13 C7.2,13 5.5,14.5 5.5,16.8 L5.5,24 L13.5,24 L13.5,16.8 C13.5,14.5 11.8,13 9.5,13 Z" />

                  <circle cx="14.5" cy="10" r="2.8" />
                  <path d="M14.5,13 C12.2,13 10.5,14.5 10.5,16.8 L10.5,24 L18.5,24 L18.5,16.8 C18.5,14.5 16.8,13 14.5,13 Z" />

                  <circle cx="12" cy="8" r="3.2" />
                  <path d="M12,11.5 C9.3,11.5 7.2,13.2 7.2,15.8 L7.2,24 L16.8,24 L16.8,15.8 C16.8,13.2 14.7,11.5 12,11.5 Z" />
                </svg>
                Users
              </button>
              <button className={view === 'logs' ? 'active' : ''} onClick={() => setView('logs')}>
                📋 Logs
              </button>
            </>
          )}
          <button className={view === 'games' ? 'active' : ''} onClick={() => setView('games')}>
            <img 
              src="/game-icon.png" 
              alt="Games" 
              style={{ width: '18px', height: '18px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '4px' }} 
            />
            Games
          </button>
          <button className={view === 'music' ? 'active' : ''} onClick={() => setView('music')}>
            <img 
              src="/music-icon.png" 
              alt="Music" 
              style={{ width: '18px', height: '18px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '4px' }} 
            />
            Music
          </button>
          <button className={view === 'knowledge' ? 'active' : ''} onClick={() => setView('knowledge')}>
            <img 
              src="/knowledge-icon.png" 
              alt="Knowledge" 
              style={{ width: '18px', height: '18px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '4px' }} 
            />
            Knowledge
          </button>
        </nav>

        <div className="navbar-right">
          {/* Nút bật/tắt chế độ sáng/tối */}
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme}
            title={isDarkMode ? "Chuyển sang Chế độ sáng" : "Chuyển sang Chế độ tối"}
          >
            {isDarkMode ? '☀️ Sáng' : '🌙 Tối'}
          </button>

          <div className="user-profile-dropdown">
            <div className="avatar-circle">{user.name.substring(0, 2).toUpperCase()}</div>
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
        </div>
      </header>

      <main>
        {view === 'feed' && <Feed key={feedKey} />}
        {view === 'dashboard' && <Dashboard />}
        {view === 'users' && user?.role === 'admin' && <Users />}
        {view === 'logs' && user?.role === 'admin' && <Logs />}
        {view === 'games' && <Games />}
        {view === 'music' && <Music />}
        {view === 'knowledge' && <Knowledge />}
      </main>

      {showPostModal && (
        <PostModal 
          onClose={() => setShowPostModal(false)} 
          onPostCreated={() => setFeedKey(prev => prev + 1)}
        />
      )}
    </div>
  );
}

export default App;
