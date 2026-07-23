import React from 'react';
import T from '../../i18n/T';

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
        <h3>📰 <T>CHỦ ĐỀ BLOG</T></h3>
      </div>
      <nav className="sidebar-menu">
        <button
          className={`menu-item ${selectedLibrary === 'all' ? 'active' : ''}`}
          onClick={() => onSelectLibrary('all')}
        >
          📚 <T>Tất Cả Bài Viết</T>
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
          <p>✍️ <T>Thể loại bài viết:</T> {stats?.totalCategories || 0}</p>
          <p>📰 <T>Tổng số bài viết:</T> {stats?.totalPosts || 0}</p>
        </div>
      </div>
    </div>
  );
}
