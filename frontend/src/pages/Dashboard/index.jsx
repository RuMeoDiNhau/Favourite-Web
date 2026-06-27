import React, { useEffect, useState } from 'react';
import CameraBox from '../../components/CameraBox';
import ResultCard from '../../components/ResultCard';
import { recognizeFace } from '../../services/api';

function Dashboard() {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('Chưa có kết quả');
  const [preview, setPreview] = useState(null);
  const [autoScan, setAutoScan] = useState(false);
  const [captureTrigger, setCaptureTrigger] = useState(0);

  useEffect(() => {
    if (!autoScan) {
      return;
    }

    const interval = setInterval(() => {
      setCaptureTrigger((prev) => prev + 1);
    }, 300000);

    return () => clearInterval(interval);
  }, [autoScan]);

  const handleCapture = async (file) => {
    setPreview(URL.createObjectURL(file));
    setStatus('loading');
    setMessage('Đang xử lý ảnh...');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageBase64 = reader.result;
      try {
        const response = await recognizeFace(imageBase64);
        const data = response.data;
        setStatus('success');
        setMessage(`${data.message} - ${data.data.name} (${data.data.user_id})`);
      } catch (error) {
        setStatus('error');
        setMessage('Không nhận diện được. Vui lòng thử lại.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h2>Quét Khuôn Mặt</h2>
          <p>Auto scan mỗi 5 phút hoặc chụp thủ công khi cần.</p>
        </div>
        <button className="button" type="button" onClick={() => setAutoScan((prev) => !prev)}>
          {autoScan ? 'Tắt auto scan' : 'Bật auto scan'}
        </button>
      </div>
      <div className="video-grid">
        <CameraBox onCapture={handleCapture} captureTrigger={captureTrigger} status={status} />
        {preview && (
          <div className="capture-preview">
            <h3>Ảnh đã chụp</h3>
            <img className="preview" src={preview} alt="capture preview" />
          </div>
        )}
      </div>
      <ResultCard status={status} message={message} />
    </section>
  );
}

export default Dashboard;
