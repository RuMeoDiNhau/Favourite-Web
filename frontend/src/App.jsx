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
    <div className="App">
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
                👥 Users
              </button>
              <button className={view === 'logs' ? 'active' : ''} onClick={() => setView('logs')}>
                📋 Logs
              </button>
            </>
          )}
          <button className={view === 'games' ? 'active' : ''} onClick={() => setView('games')}>
            🎮 Games
          </button>
          <button className={view === 'music' ? 'active' : ''} onClick={() => setView('music')}>
            🎵 Music
          </button>
          <button className={view === 'knowledge' ? 'active' : ''} onClick={() => setView('knowledge')}>
            📚 Knowledge
          </button>
        </nav>

        <div className="navbar-right">
          <div className="user-profile-dropdown">
            <div className="avatar-circle">{user.name.substring(0, 2).toUpperCase()}</div>
            <span className="username-text">{user.name} ({user.role})</span>
            <span className="chevron-icon">▼</span>
          </div>
          <button className="create-post-nav-btn" onClick={() => setShowPostModal(true)}>
            ➕ Đăng bài
          </button>
          <button className="logout-icon-btn" onClick={handleLogout} title="Đăng xuất">
            🚪 Đăng xuất
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
