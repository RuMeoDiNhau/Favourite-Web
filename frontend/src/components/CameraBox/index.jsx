import React, { useEffect, useRef, useState } from 'react';
import './CameraBox.css';

function CameraBox({ onCapture, captureTrigger, status = 'idle' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        // If the component unmounted while getUserMedia was pending, stop
        // the freshly-allocated stream immediately so the camera LED goes off
        // and the MediaStream doesn't leak until the tab closes.
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // Autoplay rejection is harmless for a CameraBox (capture is
            // triggered manually via button click or captureTrigger, both
            // of which count as user gestures).
          }
          setStreaming(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Không thể mở camera. Vui lòng kiểm tra quyền truy cập.');
        }
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      // Detach the stream from the <video> element first so the browser stops
      // rendering the final frame. Some browsers (notably Chrome) keep the
      // last frame visible until srcObject is cleared, even after tracks stop.
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (captureTrigger > 0 && streaming) {
      handleCapture();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureTrigger]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob && onCapture) {
        onCapture(new File([blob], 'capture.png', { type: 'image/png' }));
      }
    }, 'image/png');
  };

  // Map backend status to HUD CSS state classes
  const getHudClass = () => {
    if (status === 'loading' || status === 'scanning') return 'hud-loading';
    if (status === 'success') return 'hud-success';
    if (status === 'error') return 'hud-error';
    return 'hud-idle';
  };

  const getStatusText = () => {
    if (status === 'loading' || status === 'scanning') return 'Scanning...';
    if (status === 'success') return 'Verified';
    if (status === 'error') return 'Access Denied';
    return 'Sys Active';
  };

  return (
    <div className="video-box">
      <h3>Quét Khuôn Mặt</h3>
      {error ? (
        <p>{error}</p>
      ) : (
        <div className="camera-wrapper">
          <video ref={videoRef} autoPlay muted playsInline />
          
          {/* Tech HUD overlay layout */}
          <div className={`hud-overlay ${getHudClass()}`}>
            <div className="hud-corners" />
            
            <div className="hud-header">
              <span>FACE_ID v2.0</span>
              <span>LOCK: {status === 'success' ? 'OK' : 'SEARCHING'}</span>
            </div>
            
            {/* Pulsing reticle and scanning laser */}
            <div className="hud-face-reticle">
              <div className="hud-face-box" />
            </div>
            <div className="hud-scan-line" />
            
            <div className="hud-footer">
              <span className="hud-status-badge">{getStatusText()}</span>
            </div>
            
            <div className="hud-corners-bottom" />
          </div>
        </div>
      )}
      <button className="button" onClick={handleCapture} disabled={!streaming}>
        Chụp & Nhận Diện
      </button>
    </div>
  );
}

export default CameraBox;
