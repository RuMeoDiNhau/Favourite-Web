import React from 'react';

export default function Sidebar({ selectedLibrary, onSelectLibrary, stats, categories = [] }) {
  const getCategoryEmoji = (cat) => {
    const emojis = {
      'Puzzle': '🧩',
      'Action': '⚡',
      'Quiz': '🏆',
      'Casual': '🎲',
      'Arcade': '🌟'
    };
    return emojis[cat] || '🎮';
  };

  return (
    <div className="games-sidebar">
      <div className="sidebar-header">
        <h3>📰 CHỦ ĐỀ BLOG</h3>
      </div>
      <nav className="sidebar-menu">
        <button
          className={`menu-item ${selectedLibrary === 'all' ? 'active' : ''}`}
          onClick={() => onSelectLibrary('all')}
        >
          📚 Tất Cả Bài Viết
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            className={`menu-item ${selectedLibrary === cat ? 'active' : ''}`}
            onClick={() => onSelectLibrary(cat)}
          >
            {getCategoryEmoji(cat)} {cat}
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
