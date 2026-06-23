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
      <header className="App-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Fav Web</h1>
            <p>Nền tảng tích hợp nhận diện khuôn mặt, trò chơi, âm nhạc, chia sẻ kiến thức</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              className="create-post-nav-btn"
              onClick={() => setShowPostModal(true)}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '30px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              ➕ Đăng bài
            </button>
            <span className="user-welcome-banner">👋 Xin chào, <strong>{user.name}</strong></span>
          </div>
        </div>
        <nav className="app-nav">
          <button className={view === 'feed' ? 'active' : ''} onClick={() => setView('feed')}>
            📰 Bảng tin
          </button>
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
            🎯 Check-in
          </button>
          <button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>
            👥 Users
          </button>
          <button className={view === 'logs' ? 'active' : ''} onClick={() => setView('logs')}>
            📋 Logs
          </button>
          <div className="nav-divider"></div>
          <button className={view === 'games' ? 'active' : ''} onClick={() => setView('games')}>
            🎮 Games
          </button>
          <button className={view === 'music' ? 'active' : ''} onClick={() => setView('music')}>
            🎵 Music
          </button>
          <button className={view === 'knowledge' ? 'active' : ''} onClick={() => setView('knowledge')}>
            📚 Knowledge
          </button>
          <div className="nav-divider"></div>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Đăng xuất
          </button>
        </nav>
      </header>

      <main>
        {view === 'feed' && <Feed key={feedKey} />}
        {view === 'dashboard' && <Dashboard />}
        {view === 'users' && <Users />}
        {view === 'logs' && <Logs />}
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
