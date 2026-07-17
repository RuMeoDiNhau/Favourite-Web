import React, { useState, useEffect } from 'react';
import './Knowledge.css';
import * as api from '../../services/api';
import CommentSection from '../../components/Comments/CommentSection';
import { useBookmarks } from '../../lib/BookmarksContext';

export default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearchOpen, currentUser }) {
  const { isBookmarked: isBmKnowledge, toggle: toggleBm } = useBookmarks();
  // Multi-select category filter. Empty array = "All categories"
  // (no filter). Selecting multiple is an OR match — show articles
  // that belong to any of the selected categories. This lets a user
  // who wants "Lập Trình OR AI" do it with two clicks instead of
  // having to switch back and forth.
  const [selectedCategories, setSelectedCategories] = useState([]);
  // `allArticles` is the unfiltered list we got from the API.
  // `articles` is the filtered view derived from `allArticles` +
  // `selectedCategories`. We keep both because filtering on every
  // render is cheaper than re-fetching from the BE on every chip
  // toggle — Knowledge has <100 rows in practice.
  const [allArticles, setAllArticles] = useState([]);
  const [categories, setCategories] = useState([]);
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
    // Fire-and-forget the dashboard event. We bypass GET /knowledge/{id}
    // here because the list-row data already has everything we need to
    // render the modal — but the Personal Dashboard still wants to know
    // the user opened this article. The 60s dedup window on the server
    // keeps this from spamming the table if a user reopens the modal.
    api.trackActivity({
      content_type: 'knowledge', content_id: article.id, event_type: 'view',
    }).catch(() => { /* dashboard is best-effort */ });
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

  // Articles are loaded once on mount (we filter client-side by
  // category). Categories are also loaded once.
  useEffect(() => {
    loadArticles();
    loadCategories();
  }, []);

  // Derived: visible articles after applying the multi-select
  // category filter. Empty selection = show everything.
  const articles = selectedCategories.length === 0
    ? allArticles
    : allArticles.filter((a) => selectedCategories.includes(a.category));

  // When a search result asks us to deep-open a specific article,
  // search across allArticles (not just the filtered view) so a
  // hit in a category the user had filtered out still opens the
  // modal. We add the article's category to the selection so the
  // user can see where it lives in the list — without this, the
  // modal would open over an apparently empty grid (the article
  // exists but is hidden by the filter) which feels broken.
  useEffect(() => {
    if (searchOpenKnowledgeId == null) return;
    if (loading) return;
    const target = allArticles.find((a) => a.id === searchOpenKnowledgeId);
    if (target) {
      if (selectedCategories.length > 0 && !selectedCategories.includes(target.category)) {
        setSelectedCategories((prev) => [...prev, target.category]);
      }
      handleOpenArticle(target);
    }
    onConsumeSearchOpen?.();
  }, [searchOpenKnowledgeId, loading, allArticles]);

  // Listen for cross-view deep opens from the Bookmarks page.
  // Pattern matches App.jsx's search-deeplink: stash id via state
  // event, then re-enter the same handler above. We piggyback on
  // a custom event so the Bookmarks page doesn't need a callback
  // prop drilled down through App. Search in allArticles so a
  // filtered-out bookmark still opens.
  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail;
      if (!detail || detail.content_type !== 'knowledge') return;
      const target = allArticles.find((a) => a.id === detail.content_id);
      if (target) {
        if (selectedCategories.length > 0 && !selectedCategories.includes(target.category)) {
          setSelectedCategories((prev) => [...prev, target.category]);
        }
        handleOpenArticle(target);
      }
    };
    window.addEventListener('bookmarks-open', handler);
    return () => window.removeEventListener('bookmarks-open', handler);
  }, [allArticles, selectedCategories]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.fetchAllKnowledge();
      setAllArticles(response.data || []);
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
      setCategories(response.data.categories || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  // Toggle a category in/out of the selection. Treats "click the
  // active chip again" as deselect — common chip-UI convention.
  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleLikeArticle = async (articleId) => {
    try {
      await api.likeArticle(articleId);
      // Fire-and-forget the dashboard event — like endpoint already
      // records server-side too, but tracking from FE makes the
      // event appear in the same microtask as the visible UI bump
      // so the dashboard count is accurate on the very next reload.
      api.trackActivity({
        content_type: 'knowledge', content_id: articleId, event_type: 'like',
      }).catch(() => { /* dashboard is best-effort */ });
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
            <button
              className={`filter-btn ${selectedCategories.length === 0 ? 'active' : ''}`}
              onClick={() => setSelectedCategories([])}
            >
              Tất Cả
            </button>
            {categories.map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  className={`filter-btn ${active ? 'active' : ''}`}
                  onClick={() => toggleCategory(cat)}
                  aria-pressed={active}
                >
                  {cat}
                </button>
              );
            })}
            {selectedCategories.length > 0 && (
              <button
                className="filter-btn filter-btn-clear"
                onClick={() => setSelectedCategories([])}
              >
                Xóa lọc
              </button>
            )}
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
                className={`article-modal-bookmark ${isBmKnowledge('knowledge', selectedArticle.id) ? 'filled' : ''}`}
                onClick={() => toggleBm('knowledge', selectedArticle.id)}
                aria-label={isBmKnowledge('knowledge', selectedArticle.id) ? 'Bỏ lưu' : 'Lưu bài viết'}
                title={isBmKnowledge('knowledge', selectedArticle.id) ? 'Bỏ lưu' : 'Lưu bài viết'}
              >
                {isBmKnowledge('knowledge', selectedArticle.id) ? '🔖' : '⚪'}
              </button>
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

              <CommentSection
                contentType="knowledge"
                contentId={selectedArticle.id}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
