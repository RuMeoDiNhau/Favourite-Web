import React from 'react';

export default function Sidebar({ selectedCategory, onSelectCategory }) {
  const menuItems = [
    { id: 'all', label: '🎵 Tất Cả', icon: '🎵' },
    { id: 'library', label: '📚 Thư Viện', icon: '📚' },
    { id: 'playlist', label: '📋 Danh Sách Phát', icon: '📋' },
    { id: 'favorite', label: '❤️ Yêu Thích', icon: '❤️' },
    { id: 'recent', label: '⏰ Gần Đây', icon: '⏰' },
  ];

  return (
    <div className="music-sidebar">
      <div className="sidebar-header">
        <h3>🎵 THƯ VIỆN ÂM NHẠC</h3>
      </div>
      <nav className="sidebar-menu">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`menu-item ${selectedCategory === item.id ? 'active' : ''}`}
            onClick={() => onSelectCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="stats">
          <p>🎵 Bài Hát: 89</p>
          <p>📋 Danh Sách: 12</p>
          <p>⏱️ Thời Gian: 45h30m</p>
        </div>
      </div>
    </div>
  );
}
