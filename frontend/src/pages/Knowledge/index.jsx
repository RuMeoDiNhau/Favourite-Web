import React, { useState, useEffect } from 'react';
import './Knowledge.css';
import * as api from '../../services/api';
import CommentSection from '../../components/Comments/CommentSection';
import AddToCollectionButton from '../Collections/AddToCollectionButton';
import { useBookmarks } from '../../lib/BookmarksContext';
import { useTranslation } from 'react-i18next';
import T from '../../i18n/T';

export default function Knowledge({ searchOpenKnowledgeId = null, onConsumeSearchOpen, currentUser, onNavigate }) {
  const { t } = useTranslation();
  const { isBookmarked: isBmKnowledge, toggle: toggleBm } = useBookmarks();
  // Multi-select category filter. Empty array = "All categories"
  // (no filter). Selecting multiple is an OR match — show articles
  // that belong to any of the selected categories. This lets a user
  // who wants "Lập Trình OR AI" do it with two clicks instead of
  // having to switch back and forth.
  const [selectedCategories, setSelectedCategories] = useState([]);
  // Multi-select tag filter (Tier 3 L). OR match: an article is in
  // view if it has at least one of the selected tags. Tags live on
  // the article (denormalized in the list response); the FE builds
  // the suggestion list from the union across loaded articles.
  const [selectedTags, setSelectedTags] = useState([]);
  // `allArticles` is the unfiltered list we got from the API.
  // `articles` is the filtered view derived from `allArticles` +
  // `selectedCategories`. We keep both because filtering on every
  // render is cheaper than re-fetching from the BE on every chip
  // toggle — Knowledge has <100 rows in practice.
  const [allArticles, setAllArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tier 3 M: "Bài viết của tôi" tab shows the current user's
  // drafts and scheduled rows alongside their published ones. We
  // lazy-load on first toggle and re-fetch after a successful create.
  const [showMyArticles, setShowMyArticles] = useState(false);
  const [myArticles, setMyArticles] = useState([]);
  const [myArticlesLoading, setMyArticlesLoading] = useState(false);
  // Create-article modal state. `mode` is one of 'published' |
  // 'draft' | 'scheduled' — selected by the three action buttons.
  // `scheduledAt` is a `datetime-local` string (HTML5).
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState('published');
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createTags, setCreateTags] = useState('');
  const [createScheduledAt, setCreateScheduledAt] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

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
  // category filter and the multi-select tag filter. Both are
  // OR-matched individually (the existing category behavior) and
  // then AND-combined: an article must satisfy both filters to
  // appear. Empty selection on either side = no constraint from
  // that filter.
  //
  // Tier 3 M: when the "Bài viết của tôi" tab is active we source
  // from `myArticles` (which includes drafts + scheduled rows)
  // instead of `allArticles` (published-only).
  const sourceList = showMyArticles ? myArticles : allArticles;
  const articles = sourceList.filter((a) => {
    const okCat = selectedCategories.length === 0 || selectedCategories.includes(a.category);
    const articleTags = (a.tags || []).map((t) => t.name);
    const okTag = selectedTags.length === 0 || selectedTags.some((t) => articleTags.includes(t));
    return okCat && okTag;
  });

  // Union of all tags across loaded articles — drives the chip
  // suggestion row. We sort alphabetically so the chip order is
  // stable across renders. When the "Bài viết của tôi" tab is
  // active, suggestions are scoped to that subset so the chip
  // list doesn't bloat with tags from articles the viewer can't
  // see.
  const tagSuggestions = (() => {
    const set = new Set();
    for (const a of sourceList) {
      for (const t of a.tags || []) {
        if (t?.name) set.add(t.name);
      }
    }
    return Array.from(set).sort();
  })();

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
      setError(t('knowledge.err.load', { defaultValue: 'Failed to load articles' }));
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

  // Tier 3 M: lazy-load the user's own articles when they toggle
  // the tab. Re-fetches after each successful create so the new
  // row appears immediately.
  const loadMyArticles = async () => {
    if (!currentUser) return;
    setMyArticlesLoading(true);
    try {
      const data = await api.fetchMyKnowledge();
      setMyArticles(data || []);
    } catch (err) {
      console.error('[Knowledge] loadMyArticles failed', err);
    } finally {
      setMyArticlesLoading(false);
    }
  };

  useEffect(() => {
    if (showMyArticles && currentUser) {
      loadMyArticles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMyArticles]);

  const handleOpenCreate = (mode) => {
    setCreateMode(mode);
    setCreateError(null);
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (createSubmitting) return;
    if (!createTitle.trim() || !createCategory.trim()) {
      setCreateError(t('knowledge.err.title_required', { defaultValue: 'Tiêu đề và thể loại là bắt buộc.' }));
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const tagNames = createTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        title: createTitle.trim(),
        category: createCategory.trim(),
        description: createDescription.trim(),
        content: createContent,
        tags: tagNames,
        status: createMode,
      };
      if (createMode === 'scheduled') {
        if (!createScheduledAt) {
          setCreateError(t('knowledge.err.scheduled_required', { defaultValue: 'Vui lòng chọn thời điểm đăng.' }));
          setCreateSubmitting(false);
          return;
        }
        payload.scheduled_at = new Date(createScheduledAt).toISOString();
      }
      await api.createArticleWithStatus(payload);
      // Reset form + close modal.
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateCategory('');
      setCreateDescription('');
      setCreateContent('');
      setCreateTags('');
      setCreateScheduledAt('');
      // Re-sync both lists so the new row shows up immediately.
      loadArticles();
      if (showMyArticles) loadMyArticles();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setCreateError(detail || t('knowledge.err.create', { defaultValue: 'Không thể tạo bài viết.' }));
    } finally {
      setCreateSubmitting(false);
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
            alt={t('knowledge.alt.icon', { defaultValue: 'Knowledge Icon' })}
            style={{ width: '48px', height: '48px', marginRight: '15px', borderRadius: '8px' }}
          />
          <T>Chia Sẻ Kiến Thức Học Tập & Làm Việc</T>
        </h1>
        <p><T>Cộng đồng chia sẻ kiến thức, kỹ năng và kinh nghiệm</T></p>
        <div className="knowledge-create-buttons">
          <button className="create-btn" onClick={() => handleOpenCreate('published')}>✍️ <T>Viết Bài Mới</T></button>
          {currentUser && (
            <>
              <button className="create-btn create-btn-secondary" onClick={() => handleOpenCreate('draft')}>📝 <T>Lưu nháp</T></button>
              <button className="create-btn create-btn-secondary" onClick={() => handleOpenCreate('scheduled')}>⏰ <T>Hẹn giờ</T></button>
            </>
          )}
        </div>
      </div>

      <div className="knowledge-main">
        <div className="filter-bar">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${!showMyArticles ? 'active' : ''}`}
              onClick={() => setShowMyArticles(false)}
            >
              📚 <T>Tất Cả Bài Viết</T>
            </button>
            {currentUser && (
              <button
                className={`filter-btn ${showMyArticles ? 'active' : ''}`}
                onClick={() => setShowMyArticles(true)}
              >
                👤 <T>Bài viết của tôi</T>
              </button>
            )}
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
                <T>Xóa lọc</T>
              </button>
            )}
          </div>
          {tagSuggestions.length > 0 && (
            <div className="filter-buttons knowledge-tag-row">
              <span className="knowledge-tag-label">🏷️ <T>Tag:</T></span>
              {tagSuggestions.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    className={`filter-btn ${active ? 'active' : ''}`}
                    onClick={() => setSelectedTags((prev) => active ? prev.filter((t) => t !== tag) : [...prev, tag])}
                    aria-pressed={active}
                  >
                    #{tag}
                  </button>
                );
              })}
              {selectedTags.length > 0 && (
                <button
                  className="filter-btn filter-btn-clear"
                  onClick={() => setSelectedTags([])}
                >
                  <T>Xóa tag</T>
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'white' }}><T>Đang tải bài viết...</T></p>
        ) : error ? (
          <p className="knowledge-error-text">{error}</p>
        ) : (
          <div className="knowledge-grid">
            {articles.length > 0 ? (
              articles.map(article => (
                <div key={article.id} className="knowledge-card">
                  <div className="card-header">
                    <div className="card-image">📝</div>
                    <div className="card-badge">{article.category}</div>
                    {article.status && article.status !== 'published' && (
                      <div className={`card-status card-status-${article.status}`}>
                        {article.status === 'draft' ? <>📝 <T>Nháp</T></> : <>⏰ <T>Đã hẹn giờ</T></>}
                      </div>
                    )}
                  </div>

                  <div className="card-content">
                    <h3>{article.title}</h3>
                    <p className="description">{article.description}</p>

                    {article.tags && article.tags.length > 0 && (
                      <div className="card-tags">
                        {article.tags.map((t) => (
                          <button
                            key={t.id || t.name}
                            className={`card-tag ${selectedTags.includes(t.name) ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTags((prev) => prev.includes(t.name) ? prev.filter((x) => x !== t.name) : [...prev, t.name]);
                            }}
                            title={t(`knowledge.filter_by_tag`, { tag: t.name, defaultValue: `Lọc theo #${t.name}` })}
                            type="button"
                          >
                            #{t.name}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="card-meta">
                      <span className="author">👤 {article.author}</span>
                    </div>

                    <div className="card-stats">
                      <span className="stat">👁️ {article.views}</span>
                      <span className="stat">❤️ {article.likes}</span>
                    </div>

                    <div className="card-actions">
                      <button className="read-btn" onClick={() => handleOpenArticle(article)}><T>Đọc Thêm</T> →</button>
                      <button onClick={() => handleLikeArticle(article.id)} className="read-btn" style={{ marginLeft: '8px' }}>❤️ <T>Thích</T></button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-content" style={{ gridColumn: '1 / -1' }}>
                <p><T>Không có bài viết nào trong danh mục này</T></p>
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
                aria-label={isBmKnowledge('knowledge', selectedArticle.id) ? t('knowledge.unbookmark', { defaultValue: 'Bỏ lưu' }) : t('knowledge.bookmark', { defaultValue: 'Lưu bài viết' })}
                title={isBmKnowledge('knowledge', selectedArticle.id) ? t('knowledge.unbookmark', { defaultValue: 'Bỏ lưu' }) : t('knowledge.bookmark', { defaultValue: 'Lưu bài viết' })}
              >
                {isBmKnowledge('knowledge', selectedArticle.id) ? '🔖' : '⚪'}
              </button>
              <AddToCollectionButton contentType="knowledge" contentId={selectedArticle.id} />
              <button
                className="article-modal-close"
                onClick={() => setSelectedArticle(null)}
                aria-label={t('knowledge.close', { defaultValue: 'Đóng' })}
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
                <h3>📺 <T>Video liên quan</T></h3>
                {modalLoading ? (
                  <p className="videos-status"><T>Đang tìm video trên YouTube…</T></p>
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
                    <T>Không tìm thấy video liên quan. (Có thể do chưa cấu hình YOUTUBE_API_KEY.)</T>
                  </p>
                )}
              </div>

              <CommentSection
                contentType="knowledge"
                contentId={selectedArticle.id}
                currentUser={currentUser}
                onNavigate={onNavigate}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tier 3 M: create-article modal. The action buttons in the
          header (Đăng ngay / Lưu nháp / Hẹn giờ) call into here with
          a different `mode` so the submit handler knows which
          `status` to send to the BE. */}
      {showCreateModal && currentUser && (
        <div className="knowledge-create-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="knowledge-create-modal" onClick={(e) => e.stopPropagation()}>
            <button className="knowledge-create-close" onClick={() => setShowCreateModal(false)} type="button">×</button>
            <h2>
              {createMode === 'draft' ? <>📝 <T>Lưu bản nháp</T></>
                : createMode === 'scheduled' ? <>⏰ <T>Hẹn giờ đăng bài</T></>
                : <>✍️ <T>Đăng bài mới</T></>}
            </h2>
            <form onSubmit={handleSubmitCreate} className="knowledge-create-form">
              <label>
                <T>Tiêu đề</T> *
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  required
                  maxLength={255}
                  placeholder={t('knowledge.ph.title', { defaultValue: 'Ví dụ: Học React Hooks nâng cao' })}
                />
              </label>
              <label>
                <T>Thể loại</T> *
                <input
                  type="text"
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  required
                  maxLength={100}
                  list="knowledge-category-suggestions"
                  placeholder={t('knowledge.ph.category', { defaultValue: 'Ví dụ: Lập Trình' })}
                />
                <datalist id="knowledge-category-suggestions">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </label>
              <label>
                <T>Mô tả ngắn</T>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  maxLength={1024}
                  rows={2}
                />
              </label>
              <label>
                <T>Nội dung</T>
                <textarea
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  rows={6}
                />
              </label>
              <label>
                <T>Tags (phân cách bằng dấu phẩy)</T>
                <input
                  type="text"
                  value={createTags}
                  onChange={(e) => setCreateTags(e.target.value)}
                  placeholder={t('knowledge.ph.tags', { defaultValue: 'react, frontend, hooks' })}
                />
              </label>
              {createMode === 'scheduled' && (
                <label>
                  <T>Thời điểm đăng</T> *
                  <input
                    type="datetime-local"
                    value={createScheduledAt}
                    onChange={(e) => setCreateScheduledAt(e.target.value)}
                    required
                  />
                </label>
              )}
              {createError && <div className="knowledge-create-error">{createError}</div>}
              <div className="knowledge-create-actions">
                <button type="submit" className="knowledge-create-submit" disabled={createSubmitting}>
                  {createSubmitting ? <T>Đang lưu...</T>
                    : createMode === 'draft' ? <>📝 <T>Lưu nháp</T></>
                    : createMode === 'scheduled' ? <>⏰ <T>Hẹn giờ</T></>
                    : <>🚀 <T>Đăng ngay</T></>}
                </button>
                <button type="button" className="knowledge-create-cancel" onClick={() => setShowCreateModal(false)}>
                  <T>Huỷ</T>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
