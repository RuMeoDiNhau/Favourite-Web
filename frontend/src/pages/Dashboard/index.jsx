import React, { useEffect, useState } from 'react';
import CameraBox from '../../components/CameraBox';
import ResultCard from '../../components/ResultCard';
import { recognizeFace } from '../../services/api';
import { useTranslation } from 'react-i18next';

function Dashboard() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState(t('dashboard.idle'));
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
    setMessage(t('dashboard.processing'));

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
        setMessage(t('dashboard.unrecognized'));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h2>{t('dashboard.title')}</h2>
          <p>{t('dashboard.subtitle')}</p>
        </div>
        <button className="button" type="button" onClick={() => setAutoScan((prev) => !prev)}>
          {autoScan ? t('dashboard.autoScanOn') : t('dashboard.autoScanOff')}
        </button>
      </div>
      <div className="video-grid">
        <CameraBox onCapture={handleCapture} captureTrigger={captureTrigger} status={status} />
        {preview && (
          <div className="capture-preview">
            <h3>{t('dashboard.capturedImage')}</h3>
            <img className="preview" src={preview} alt={t('dashboard.altPreview')} />
          </div>
        )}
      </div>
      <ResultCard status={status} message={message} />
    </section>
  );
}

export default Dashboard;