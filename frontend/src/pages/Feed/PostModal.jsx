import React, { useState } from 'react';
import './PostModal.css';
import * as api from '../../services/api';

export default function PostModal({ onClose, onPostCreated }) {
  const [postType, setPostType] = useState('text'); // 'image', 'video', 'audio', 'game', 'text'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // File states
  const [mainFile, setMainFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  
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

  const handleThumbnailFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnailFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề bài đăng.');
      return;
    }

    // Validation for files based on post type
    if (postType === 'image' && !mainFile) {
      setError('Vui lòng chọn một tệp hình ảnh.');
      return;
    }
    if (postType === 'video' && !mainFile) {
      setError('Vui lòng chọn một tệp video.');
      return;
    }
    if (postType === 'audio' && !mainFile) {
      setError('Vui lòng chọn một tệp âm thanh.');
      return;
    }
    if (postType === 'game' && !mainFile) {
      setError('Vui lòng chọn tệp Game (.zip).');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setProgress(0);
      setSuccess(false);

      let mediaUrl = null;
      let thumbnailUrl = null;

      // 1. Upload main media file
      if (mainFile) {
        setUploadStage('main');
        const resMain = await api.uploadPostFile(mainFile, postType, (percent) => {
          setProgress(percent);
        });
        mediaUrl = resMain.data.media_url;
      }

      // 2. Upload thumbnail/album art file if present
      if (thumbnailFile) {
        setUploadStage('thumbnail');
        setProgress(0);
        const resThumb = await api.uploadPostFile(thumbnailFile, 'image', (percent) => {
          setProgress(percent);
        });
        thumbnailUrl = resThumb.data.media_url;
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
      setError(err.response?.data?.detail || 'Đã xảy ra lỗi trong quá trình đăng bài. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const getMainFileInputLabel = () => {
    switch (postType) {
      case 'image': return 'Chọn tệp ảnh (JPG, PNG, GIF) *';
      case 'video': return 'Chọn tệp video (MP4) *';
      case 'audio': return 'Chọn tệp âm thanh (MP3, WAV) *';
      case 'game': return 'Chọn tệp lưu trữ Game (.zip) *';
      default: return 'Tệp đính kèm';
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
          <h2>➕ Tạo bài đăng mới</h2>
          <button className="post-modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="post-error-banner">❌ {error}</div>}
        {success && <div className="post-success-banner">✔️ Đăng bài viết thành công!</div>}

        <form onSubmit={handleSubmit} className="post-form">
          {/* Post Type Tabs */}
          <div className="post-type-selector">
            <button 
              type="button"
              className={postType === 'text' ? 'active' : ''} 
              onClick={() => { setPostType('text'); setMainFile(null); setThumbnailFile(null); setError(''); }}
              disabled={loading}
            >
              📝 Bài viết
            </button>
            <button 
              type="button" 
              className={postType === 'image' ? 'active' : ''} 
              onClick={() => { setPostType('image'); setMainFile(null); setThumbnailFile(null); setError(''); }}
              disabled={loading}
            >
              📸 Ảnh
            </button>
            <button 
              type="button" 
              className={postType === 'video' ? 'active' : ''} 
              onClick={() => { setPostType('video'); setMainFile(null); setThumbnailFile(null); setError(''); }}
              disabled={loading}
            >
              🎥 Video
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
              Nhạc
            </button>
            <button 
              type="button" 
              className={postType === 'game' ? 'active' : ''} 
              onClick={() => { setPostType('game'); setMainFile(null); setThumbnailFile(null); setError(''); }}
              disabled={loading}
            >
              <img 
                src="/game-icon.png" 
                alt="Game" 
                style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', borderRadius: '3px' }} 
              />
              Game
            </button>
          </div>

          <div className="form-group">
            <label>Tiêu đề bài đăng *</label>
            <input 
              type="text" 
              placeholder="Nhập tiêu đề hấp dẫn..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label>{postType === 'text' ? 'Nội dung bài viết' : 'Mô tả / Caption'}</label>
            <textarea 
              placeholder="Nội dung chi tiết..." 
              rows={postType === 'text' ? 8 : 4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          {postType !== 'text' && (
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
              <label>Ảnh bìa / Cover Image (Tùy chọn)</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleThumbnailFileChange}
                disabled={loading}
              />
              {thumbnailFile && <span className="file-selected-name">🖼️ {thumbnailFile.name} ({(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB)</span>}
            </div>
          )}

          {/* Loading and Progress Bar */}
          {loading && (
            <div className="post-progress-container">
              <div className="progress-label">
                {uploadStage === 'main' && `Đang tải tệp chính lên: ${progress}%`}
                {uploadStage === 'thumbnail' && `Đang tải ảnh bìa lên: ${progress}%`}
                {uploadStage === 'submitting' && 'Đang đồng bộ hóa dữ liệu & giải nén...'}
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
              Hủy
            </button>
            <button 
              type="submit" 
              className="btn-submit" 
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Đăng bài'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
