import React, { useState, useEffect } from 'react';
import './Knowledge.css';
import * as api from '../../services/api';

export default function Knowledge() {
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState(['Tất Cả']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadArticles();
    loadCategories();
  }, [selectedTopic]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      let response;
      if (selectedTopic === 'all') {
        response = await api.fetchAllKnowledge();
      } else {
        response = await api.fetchKnowledgeByCategory(selectedTopic);
      }
      setArticles(response.data || []);
    } catch (err) {
      console.error('Error loading articles:', err);
      setError('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.fetchKnowledgeCategories();
      setCategories(['Tất Cả', ...response.data.categories]);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const handleLikeArticle = async (articleId) => {
    try {
      await api.likeArticle(articleId);
      loadArticles();
    } catch (err) {
      console.error('Error liking article:', err);
    }
  };

  return (
    <div className="knowledge-container">
      <div className="knowledge-header">
        <h1>📚 Chia Sẻ Kiến Thức Học Tập & Làm Việc</h1>
        <p>Cộng đồng chia sẻ kiến thức, kỹ năng và kinh nghiệm</p>
        <button className="create-btn">✍️ Viết Bài Mới</button>
      </div>

      <div className="knowledge-main">
        <div className="filter-bar">
          <div className="filter-buttons">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                className={`filter-btn ${selectedTopic === (cat === 'Tất Cả' ? 'all' : cat) ? 'active' : ''}`}
                onClick={() => setSelectedTopic(cat === 'Tất Cả' ? 'all' : cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'white' }}>Đang tải bài viết...</p>
        ) : error ? (
          <p style={{ textAlign: 'center', color: '#ff6b6b' }}>{error}</p>
        ) : (
          <div className="knowledge-grid">
            {articles.length > 0 ? (
              articles.map(article => (
                <div key={article.id} className="knowledge-card">
                  <div className="card-header">
                    <div className="card-image">📝</div>
                    <div className="card-badge">{article.category}</div>
                  </div>

                  <div className="card-content">
                    <h3>{article.title}</h3>
                    <p className="description">{article.description}</p>

                    <div className="card-meta">
                      <span className="author">👤 {article.author}</span>
                    </div>

                    <div className="card-stats">
                      <span className="stat">👁️ {article.views}</span>
                      <span className="stat">❤️ {article.likes}</span>
                    </div>

                    <div className="card-actions">
                      <button className="read-btn">Đọc Thêm →</button>
                      <button onClick={() => handleLikeArticle(article.id)} className="read-btn" style={{ marginLeft: '8px' }}>❤️ Thích</button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-content" style={{ gridColumn: '1 / -1' }}>
                <p>Không có bài viết nào trong danh mục này</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
