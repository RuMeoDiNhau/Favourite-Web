import React, { useState } from 'react';
import './PostModal.css';
import * as api from '../../services/api';
import { useTranslation } from 'react-i18next';

export default function PostModal({ onClose, onPostCreated }) {
  const { t } = useTranslation();
  const [postType, setPostType] = useState('text'); // 'image', 'video', 'audio', 'game', 'text'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // File states
  const [mainFile, setMainFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);

  // Upload and loading states
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState(''); // 'main', 'thumbnail', 'submitting'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleMainFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setMainFile(e.target.files[0]);
    }
  };

  const handleMultipleImagesChange = (e) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...selected]);
    }
  };

  const removeImageFile = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleThumbnailFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnailFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('post.err.titleRequired'));
      return;
    }

    // Validation for files based on post type
    if (postType === 'image' && !mainFile && imageFiles.length === 0) {
      setError(t('post.err.imageRequired') || 'Vui lòng chọn ít nhất một hình ảnh');
      return;
    }
    if (postType === 'video' && !mainFile) {
      setError(t('post.err.videoRequired'));
      return;
    }
    if (postType === 'audio' && !mainFile) {
      setError(t('post.err.audioRequired'));
      return;
    }

    const uploadedUrls = [];
    let mediaUrl = null;
    let thumbnailUrl = null;

    try {
      setLoading(true);
      setError('');
      setProgress(0);
      setSuccess(false);

      // 1. Upload multiple image files if present
      if (imageFiles.length > 0) {
        setUploadStage('main');
        const uploadedMediaUrls = [];
        for (let i = 0; i < imageFiles.length; i++) {
          const res = await api.uploadPostFile(imageFiles[i], 'image', (percent) => {
            const overallPercent = Math.round(((i + percent / 100) / imageFiles.length) * 100);
            setProgress(overallPercent);
          });
          if (res.data?.media_url) {
            uploadedMediaUrls.push(res.data.media_url);
            uploadedUrls.push(res.data.media_url);
          }
        }
        mediaUrl = uploadedMediaUrls.join(',');
      } else if (mainFile) {
        setUploadStage('main');
        const folderType = postType === 'text' ? 'image' : postType;
        const resMain = await api.uploadPostFile(mainFile, folderType, (percent) => {
          setProgress(percent);
        });
        mediaUrl = resMain.data.media_url;
        if (mediaUrl) uploadedUrls.push(mediaUrl);
      }

      // 2. Upload thumbnail/album art file if present
      if (thumbnailFile) {
        setUploadStage('thumbnail');
        setProgress(0);
        const resThumb = await api.uploadPostFile(thumbnailFile, 'image', (percent) => {
          setProgress(percent);
        });
        thumbnailUrl = resThumb.data.media_url;
        if (thumbnailUrl) uploadedUrls.push(thumbnailUrl);
      }

      // 3. Create the post in database
      setUploadStage('submitting');
      await api.createPost({
        post_type: postType,
        title: title,
        description: description,
        media_url: mediaUrl,
        thumbnail: thumbnailUrl,
        status: 'public'
      });

      setSuccess(true);
      if (onPostCreated) {
        onPostCreated();
      }
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error creating post:', err);
      setError(api.formatErrorMessage(err.response?.data?.detail, t('post.err.generic')));
      if (uploadedUrls.length) {
        await Promise.all(uploadedUrls.map((u) => api.deleteUploadedFile(u)));
      }
    } finally {
      setLoading(false);
    }
  };

  const getMainFileInputLabel = () => {
    switch (postType) {
      case 'image': return t('post.fileImage');
      case 'video': return t('post.fileVideo');
      case 'audio': return t('post.fileAudio');
      case 'game': return t('post.fileGame');
      default: return t('post.fileDefault');
    }
  };

  const getMainFileAcceptType = () => {
    switch (postType) {
      case 'image': return 'image/*';
      case 'video': return 'video/*';
      case 'audio': return 'audio/*';
      case 'game': return '.zip';
      default: return '*';
    }
  };

  return (
    <div className="post-modal-overlay" onClick={onClose}>
      <div className="post-modal-content" onClick={e => e.stopPropagation()}>
        <div className="post-modal-header">
          <h2>{t('post.modalTitle')}</h2>
          <button className="post-modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="post-error-banner">❌ {error}</div>}
        {success && <div className="post-success-banner">{t('post.success')}</div>}

        <form onSubmit={handleSubmit} className="post-form">
          {/* Post Type Tabs */}
          <div className="post-type-selector">
            <button
              type="button"
              className={postType === 'text' ? 'active' : ''}
              onClick={() => { setPostType('text'); setMainFile(null); setThumbnailFile(null); setError(''); }}
              disabled={loading}
            >
              {t('post.typeText')}
            </button>
            <button
              type="button"
              className={postType === 'image' ? 'active' : ''}
              onClick={() => { setPostType('image'); setMainFile(null); setThumbnailFile(null); setError(''); }}
              disabled={loading}
            >
              {t('post.typeImage')}
            </button>
            <button
              type="button"
              className={postType === 'video' ? 'active' : ''}
              onClick={() => { setPostType('video'); setMainFile(null); setThumbnailFile(null); setError(''); }}
              disabled={loading}
            >
              {t('post.typeVideo')}
            </button>
            <button
              type="button"
              className={postType === 'audio' ? 'active' : ''}
              onClick={() => { setPostType('audio'); setMainFile(null); setThumbnailFile(null); setError(''); }}
              disabled={loading}
            >
              <img
                src="/music-icon.png"
                alt="Music"
                style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '3px' }}
              />
              {t('post.typeAudio')}
            </button>
            <button
              type="button"
              className={postType === 'game' ? 'active' : ''}
              onClick={() => { setPostType('game'); setMainFile(null); setThumbnailFile(null); setImageFiles([]); setError(''); }}
              disabled={loading}
            >
              <img
                src="/game-icon.png"
                alt="Game"
                style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '3px' }}
              />
              🎮 Game
            </button>
          </div>

          <div className="form-group">
            <label>{t('post.titleLabel')}</label>
            <input
              type="text"
              placeholder={t('post.titlePh')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label>{postType === 'text' ? t('post.textContent') : t('post.descContent')}</label>
            <textarea
              placeholder={t('post.contentPh')}
              rows={postType === 'text' ? 8 : 4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Multi-photo upload for Game blog, Image post, or Text post */}
          {(postType === 'game' || postType === 'image' || postType === 'text') && (
            <div className="form-group file-group">
              <label>
                {postType === 'game'
                  ? '📸 ' + (t('post.gamePhotos') || 'Ảnh đính kèm cho bài Blog Game (Chọn nhiều ảnh như Facebook)')
                  : postType === 'image'
                  ? '📸 ' + (t('post.fileImage') || 'Chọn hình ảnh (Có thể chọn nhiều ảnh)')
                  : '📸 ' + (t('post.optionalPhoto') || 'Hình ảnh đính kèm (Tùy chọn, chọn nhiều ảnh)')}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleMultipleImagesChange}
                disabled={loading}
              />
              {/* Photo preview gallery in modal */}
              {imageFiles.length > 0 && (
                <div className="modal-photo-preview-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {imageFiles.map((file, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '70px', height: '70px' }}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`preview ${idx}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImageFile(idx)}
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Video or Audio single file input */}
          {(postType === 'video' || postType === 'audio') && (
            <div className="form-group file-group">
              <label>{getMainFileInputLabel()}</label>
              <input
                type="file"
                accept={getMainFileAcceptType()}
                onChange={handleMainFileChange}
                disabled={loading}
              />
              {mainFile && <span className="file-selected-name">📎 {mainFile.name} ({(mainFile.size / (1024 * 1024)).toFixed(2)} MB)</span>}
            </div>
          )}

          {/* Conditional thumbnail for game or audio */}
          {(postType === 'audio' || postType === 'game') && (
            <div className="form-group file-group">
              <label>{t('post.coverImage')}</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailFileChange}
                disabled={loading}
              />
              {thumbnailFile && <span className="file-selected-name">🖼️ {thumbnailFile.name} ({(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB)</span>}
            </div>
          )}

          {error && <div className="post-error-msg" style={{ color: '#ef4444', marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>{typeof error === 'string' ? error : api.formatErrorMessage(error)}</div>}

          {/* Loading and Progress Bar */}
          {loading && (
            <div className="post-progress-container">
              <div className="progress-label">
                {uploadStage === 'main' && t('post.uploading', { percent: progress })}
                {uploadStage === 'thumbnail' && t('post.uploadingThumb', { percent: progress })}
                {uploadStage === 'submitting' && t('post.submitting')}
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${uploadStage === 'submitting' ? 100 : progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="post-form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              {t('post.cancel')}
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? t('post.submitting2') : t('post.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}