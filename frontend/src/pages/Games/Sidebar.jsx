import React from 'react';

export default function Sidebar({ selectedLibrary, onSelectLibrary }) {
  const menuItems = [
    { id: 'all', label: '📚 Tất Cả Trò Chơi', icon: '📚' },
    { id: 'favorites', label: '❤️ Yêu Thích', icon: '❤️' },
    { id: 'playing', label: '▶️ Đang Chơi', icon: '▶️' },
    { id: 'completed', label: '✅ Đã Hoàn Thành', icon: '✅' },
  ];

  return (
    <div className="games-sidebar">
      <div className="sidebar-header">
        <h3>🎮 THƯ VIỆN TRÒ CHƠI</h3>
      </div>
      <nav className="sidebar-menu">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`menu-item ${selectedLibrary === item.id ? 'active' : ''}`}
            onClick={() => onSelectLibrary(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="stats">
          <p>👤 Trò Chơi Yêu Thích: 2</p>
          <p>🎮 Đang Chơi: 1</p>
          <p>✅ Hoàn Thành: 5</p>
        </div>
      </div>
    </div>
  );
}
