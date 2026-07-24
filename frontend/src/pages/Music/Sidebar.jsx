import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Sidebar({ selectedCategory, onSelectCategory, stats }) {
  const { t } = useTranslation();
  const menuItems = [
    { id: 'all', labelKey: 'music.sidebar.all', icon: '🎵' },
    { id: 'library', labelKey: 'music.sidebar.library', icon: '📚' },
    { id: 'playlist', labelKey: 'music.sidebar.playlist', icon: '📋' },
    { id: 'favorite', labelKey: 'music.sidebar.favorite', icon: '❤️' },
    { id: 'recent', labelKey: 'music.sidebar.recent', icon: '⏰' },
  ];

  return (
    <div className="music-sidebar">
      <div className="sidebar-header">
        <h3>🎵 {t('music.libraryHeading')}</h3>
      </div>
      <nav className="sidebar-menu">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`menu-item ${selectedCategory === item.id ? 'active' : ''}`}
            onClick={() => onSelectCategory(item.id)}
          >
            {item.icon} {t(item.labelKey)}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="stats">
          <p>🎵 {t('music.sidebar.songs')} {stats?.totalSongs || 0}</p>
          <p>📋 {t('music.sidebar.playlists')} {stats?.totalPlaylists || 0}</p>
          <p>⏱️ {t('music.sidebar.duration')} {stats?.totalDuration || '0h 00m'}</p>
        </div>
      </div>
    </div>
  );
}