import React from 'react';

export default function Sidebar({ selectedLibrary, onSelectLibrary, stats }) {
  const menuItems = [
    { id: 'all', label: '📚 Tất Cả Bài Viết', icon: '📚' },
    { id: 'Puzzle', label: '🧩 Giải Đố (Puzzle)', icon: '🧩' },
    { id: 'Action', label: '⚡ Hành Động (Action)', icon: '⚡' },
    { id: 'Quiz', label: '🏆 Trắc Nghiệm (Quiz)', icon: '🏆' },
    { id: 'Casual', label: '🎲 Phổ Thông (Casual)', icon: '🎲' },
    { id: 'Arcade', label: '🌟 Cổ Điển (Arcade)', icon: '🌟' },
  ];

  return (
    <div className="games-sidebar">
      <div className="sidebar-header">
        <h3>📰 CHỦ ĐỀ BLOG</h3>
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
          <p>✍️ Thể loại bài viết: {stats?.totalCategories || 0}</p>
          <p>📰 Tổng số bài viết: {stats?.totalPosts || 0}</p>
        </div>
      </div>
    </div>
  );
}
