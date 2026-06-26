import React, { useEffect, useRef, useState } from 'react';

function CameraBox({ onCapture, captureTrigger }) {
  const videoRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let localStream = null;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        localStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreaming(true);
        }
      } catch (err) {
        setError('Không thể mở camera. Vui lòng kiểm tra quyền truy cập.');
      }
    };

    startCamera();
    return () => {
      if (localStream) {
        const tracks = localStream.getTracks();
        tracks.forEach((track) => track.stop());
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

  return (
    <div className="video-box">
      <h3>Camera</h3>
      {error ? (
        <p>{error}</p>
      ) : (
        <video ref={videoRef} autoPlay muted playsInline />
      )}
      <button className="button" onClick={handleCapture} disabled={!streaming}>
        Chụp ảnh
      </button>
    </div>
  );
}

export default CameraBox;
