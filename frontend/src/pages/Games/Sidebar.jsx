import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Sidebar({ selectedLibrary, onSelectLibrary, stats, categories = [] }) {
  const { t } = useTranslation();
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
        <h3>📰 {t('games.blogTopics')}</h3>
      </div>
      <nav className="sidebar-menu">
        <button
          className={`menu-item ${selectedLibrary === 'all' ? 'active' : ''}`}
          onClick={() => onSelectLibrary('all')}
        >
          📚 {t('games.allArticles')}
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
          <p>✍️ {t('games.sidebarCategoryLabel')} {stats?.totalCategories || 0}</p>
          <p>📰 {t('games.sidebarTotalLabel')} {stats?.totalPosts || 0}</p>
        </div>
      </div>
    </div>
  );
}