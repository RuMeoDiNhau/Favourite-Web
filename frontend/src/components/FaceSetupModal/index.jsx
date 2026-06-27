import React, { useEffect, useRef, useState, useCallback } from 'react';
import { registerFace } from '../../services/api';
import './FaceSetupModal.css';

const TOTAL_SHOTS = 5;
const SHOT_INTERVAL_MS = 1200;

export default function FaceSetupModal({ onClose, onSuccess }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [streaming, setStreaming] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | capturing | processing | success | error
  const [capturedCount, setCapturedCount] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreaming(true);
        }
      } catch {
        setCameraError('Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.');
      }
    };
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/png');
  }, []);

  const submitFrames = useCallback(async (frames) => {
    setPhase('processing');
    setStatusMsg('Đang lưu dữ liệu khuôn mặt...');
    try {
      const res = await registerFace(frames);
      const data = res.data;
      setPhase('success');
      setStatusMsg(
        data.data?.new_faces > 0
          ? `✅ Đã đăng ký ${data.data.new_faces} khuôn mặt thành công!`
          : '✅ Ảnh đã lưu! (Không phát hiện khuôn mặt để tạo Face ID)'
      );
      setTimeout(() => onSuccess && onSuccess(data), 1800);
    } catch (err) {
      setPhase('error');
      setStatusMsg(err.response?.data?.detail || 'Lưu thất bại. Vui lòng thử lại.');
    }
  }, [onSuccess]);

  const startCapture = useCallback(() => {
    if (!streaming) return;
    setPhase('capturing');
    setCapturedCount(0);
    setStatusMsg('Đang quét khuôn mặt...');

    const frames = [];
    let count = 0;
    intervalRef.current = setInterval(() => {
      const frame = captureFrame();
      if (frame) {
        frames.push(frame);
        count++;
        setCapturedCount(count);
        setStatusMsg(`Đã chụp ${count}/${TOTAL_SHOTS} ảnh...`);
      }
      if (count >= TOTAL_SHOTS) {
        clearInterval(intervalRef.current);
        submitFrames(frames);
      }
    }, SHOT_INTERVAL_MS);
  }, [streaming, captureFrame, submitFrames]);

  const handleRetry = () => {
    setCapturedCount(0);
    setPhase('idle');
    setStatusMsg('');
  };

  const hudClass =
    phase === 'capturing' ? 'fsm-hud-scanning'
    : phase === 'success' ? 'fsm-hud-success'
    : phase === 'error' ? 'fsm-hud-error'
    : 'fsm-hud-idle';

  const canClose = phase !== 'capturing' && phase !== 'processing';

  return (
    <div className="fsm-backdrop" onClick={(e) => e.target === e.currentTarget && canClose && onClose()}>
      <div className="fsm-card">
        <div className="fsm-header">
          <div className="fsm-header-icon">🔐</div>
          <div style={{ flex: 1 }}>
            <h2 className="fsm-title">Kích hoạt Face ID</h2>
            <p className="fsm-subtitle">Quét khuôn mặt để đăng nhập nhanh trong tương lai</p>
          </div>
          <button className="fsm-close-btn" onClick={onClose} disabled={!canClose} title="Đóng">✕</button>
        </div>

        <div className="fsm-camera-wrap">
          {cameraError ? (
            <div className="fsm-cam-error">{cameraError}</div>
          ) : (
            <>
              <video ref={videoRef} autoPlay muted playsInline className="fsm-video" />
              <div className={`fsm-hud ${hudClass}`}>
                <div className="fsm-hud-corner tl" />
                <div className="fsm-hud-corner tr" />
                <div className="fsm-hud-corner bl" />
                <div className="fsm-hud-corner br" />
                <div className="fsm-hud-header">
                  <span>FACE_ENROLL v2.0</span>
                  <span>{phase === 'success' ? 'SAVED' : phase === 'capturing' ? 'SCANNING' : 'READY'}</span>
                </div>
                {phase === 'capturing' && <div className="fsm-scan-line" />}
                <div className="fsm-face-reticle">
                  <div className="fsm-face-box" />
                </div>
                <div className="fsm-hud-footer">
                  <span className="fsm-hud-badge">
                    {phase === 'idle' && 'AWAITING'}
                    {phase === 'capturing' && `${capturedCount}/${TOTAL_SHOTS}`}
                    {phase === 'processing' && 'SAVING...'}
                    {phase === 'success' && '✓ ENROLLED'}
                    {phase === 'error' && '✗ FAILED'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {(phase === 'capturing' || phase === 'processing') && (
          <div className="fsm-progress">
            {Array.from({ length: TOTAL_SHOTS }).map((_, i) => (
              <div key={i} className={`fsm-dot ${i < capturedCount ? 'fsm-dot-filled' : ''}`} />
            ))}
          </div>
        )}

        {statusMsg && (
          <p className={`fsm-status-text ${
            phase === 'error' ? 'fsm-status-error'
            : phase === 'success' ? 'fsm-status-success'
            : 'fsm-status-info'
          }`}>{statusMsg}</p>
        )}

        {phase === 'idle' && (
          <ul className="fsm-tips">
            <li>📸 Hệ thống sẽ tự động chụp <strong>{TOTAL_SHOTS} ảnh</strong> liên tiếp</li>
            <li>💡 Đảm bảo đủ ánh sáng, nhìn thẳng vào camera</li>
            <li>🚫 Không che mặt hoặc đội mũ / kính quá dày</li>
          </ul>
        )}

        <div className="fsm-actions">
          {phase === 'idle' && (
            <button className="fsm-btn-primary" onClick={startCapture} disabled={!streaming || !!cameraError}>
              📷 Bắt đầu quét khuôn mặt
            </button>
          )}
          {phase === 'error' && (
            <button className="fsm-btn-primary" onClick={handleRetry}>🔄 Thử lại</button>
          )}
          {(phase === 'idle' || phase === 'error') && (
            <button className="fsm-btn-secondary" onClick={onClose}>Bỏ qua, làm sau</button>
          )}
          {phase === 'success' && (
            <button className="fsm-btn-primary" onClick={onClose}>Hoàn tất 🎉</button>
          )}
        </div>
      </div>
    </div>
  );
}

