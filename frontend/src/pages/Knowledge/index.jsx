import React, { useState, useEffect } from 'react';
import './Knowledge.css';
import * as api from '../../services/api';

export default function Knowledge() {
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState(['Tất Cả']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state: which article is open, the videos fetched for it, and
  // whether the videos request is still in flight.
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleVideos, setArticleVideos] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // ESC closes the modal — simple keyboard a11y win.
  useEffect(() => {
    if (!selectedArticle) return;
    const onKey = (e) => { if (e.key === 'Escape') setSelectedArticle(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedArticle]);

  const handleOpenArticle = async (article) => {
    // Reuse the list-row data we already have (full content is the same
    // payload as GET /knowledge/{id} which also bumps the view counter),
    // then fetch videos in parallel and open the modal immediately.
    setSelectedArticle(article);
    setArticleVideos([]);
    setModalLoading(true);
    try {
      // Fire both — fire-and-forget the article fetch since we already
      // have it; just await the videos which is the new data we need.
      const videos = await api.fetchArticleVideos(article.id);
      setArticleVideos(videos);
    } catch (err) {
      console.error('Error loading article videos:', err);
      setArticleVideos([]);
    } finally {
      setModalLoading(false);
    }
  };

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
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src="/knowledge-icon.png" 
            alt="Knowledge Icon" 
            style={{ width: '48px', height: '48px', marginRight: '15px', borderRadius: '8px' }} 
          />
          Chia Sẻ Kiến Thức Học Tập & Làm Việc
        </h1>
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
                      <button className="read-btn" onClick={() => handleOpenArticle(article)}>Đọc Thêm →</button>
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

      {selectedArticle && (
        <div className="article-modal-overlay" onClick={() => setSelectedArticle(null)}>
          <div
            className="article-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selectedArticle.title}
          >
            <div className="article-modal-header">
              <div>
                <span className="card-badge">{selectedArticle.category}</span>
                <h2>{selectedArticle.title}</h2>
                <div className="article-modal-meta">
                  <span>👤 {selectedArticle.author}</span>
                  <span>👁️ {selectedArticle.views}</span>
                  <span>❤️ {selectedArticle.likes}</span>
                </div>
              </div>
              <button
                className="article-modal-close"
                onClick={() => setSelectedArticle(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="article-modal-body">
              <p className="article-modal-desc">{selectedArticle.description}</p>
              {selectedArticle.content && (
                <p className="article-modal-content">{selectedArticle.content}</p>
              )}

              <div className="article-modal-videos">
                <h3>📺 Video liên quan</h3>
                {modalLoading ? (
                  <p className="videos-status">Đang tìm video trên YouTube…</p>
                ) : articleVideos.length > 0 ? (
                  <div className="video-grid">
                    {articleVideos.map((v) => (
                      <div key={v.videoId} className="video-item">
                        <iframe
                          src={`https://www.youtube.com/embed/${v.videoId}`}
                          title={v.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                        <div className="video-meta">
                          <p className="video-title">{v.title}</p>
                          <p className="video-channel">{v.channel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="videos-status">
                    Không tìm thấy video liên quan. (Có thể do chưa cấu hình YOUTUBE_API_KEY.)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
