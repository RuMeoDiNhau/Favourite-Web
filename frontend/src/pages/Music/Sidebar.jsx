import React from 'react';
import T from '../../i18n/T';

export default function Sidebar({ selectedCategory, onSelectCategory, stats }) {
  const menuItems = [
    { id: 'all', labelKey: 'Tất Cả', icon: '🎵' },
    { id: 'library', labelKey: 'Thư Viện', icon: '📚' },
    { id: 'playlist', labelKey: 'Danh Sách Phát', icon: '📋' },
    { id: 'favorite', labelKey: 'Yêu Thích', icon: '❤️' },
    { id: 'recent', labelKey: 'Gần Đây', icon: '⏰' },
  ];

  return (
    <div className="music-sidebar">
      <div className="sidebar-header">
        <h3>🎵 <T>THƯ VIỆN ÂM NHẠC</T></h3>
      </div>
      <nav className="sidebar-menu">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`menu-item ${selectedCategory === item.id ? 'active' : ''}`}
            onClick={() => onSelectCategory(item.id)}
          >
            {item.icon} <T>{item.labelKey}</T>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="stats">
          <p>🎵 <T>Bài Hát:</T> {stats?.totalSongs || 0}</p>
          <p>📋 <T>Danh Sách:</T> {stats?.totalPlaylists || 0}</p>
          <p>⏱️ <T>Thời Gian:</T> {stats?.totalDuration || '0h 00m'}</p>
        </div>
      </div>
    </div>
  );
}
