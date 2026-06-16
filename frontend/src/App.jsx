import React, { useState } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Logs from './pages/Logs';
import Games from './pages/Games';
import Music from './pages/Music';
import Knowledge from './pages/Knowledge';

function App() {
  const [view, setView] = useState('dashboard');

  return (
    <div className="App">
      <header className="App-header">
        <div>
          <h1>Fav Web</h1>
          <p>Nền tảng tích hợp nhận diện khuôn mặt, trò chơi, âm nhạc, chia sẻ kiến thức</p>
        </div>
        <nav className="app-nav">
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
        </nav>
      </header>

      <main>
        {view === 'dashboard' && <Dashboard />}
        {view === 'users' && <Users />}
        {view === 'logs' && <Logs />}
        {view === 'games' && <Games />}
        {view === 'music' && <Music />}
        {view === 'knowledge' && <Knowledge />}
      </main>
    </div>
  );
}

export default App;
