import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CameraBox from '../../components/CameraBox';
import * as api from '../../services/api';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const { t } = useTranslation();
  const [isRegistering, setIsRegistering] = useState(false); // Trạng thái Đăng ký vs Đăng nhập

  // Trạng thái Đăng nhập
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'face'
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [faceStatus, setFaceStatus] = useState('idle'); // 'idle', 'scanning', 'success', 'error'

  // Trạng thái Đăng ký
  const [regForm, setRegForm] = useState({
    user_id: '',
    name: '',
    email: '',
    password: '',
    department: '',
  });
  const [regFiles, setRegFiles] = useState([]);

  // Trạng thái chung
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const formatErrorMsg = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || d.detail || JSON.stringify(d)).join(', ');
    }
    return JSON.stringify(detail);
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) {
      setError(t('auth.err.fillAll'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await api.loginWithPassword(usernameOrEmail, password);
      const data = response.data;

      if (data.status === 'success') {
        if (data.token) {
          try { localStorage.setItem('token', data.token); } catch (_) {}
        }
        onLoginSuccess(data.user);
      }
    } catch (err) {
      console.error(err);
      setError(formatErrorMsg(err, t('auth.err.passwordFail')));
    } finally {
      setLoading(false);
    }
  };

  const handleFaceCapture = async (file) => {
    setFaceStatus('scanning');
    setError('');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageBase64 = reader.result;
      try {
        const response = await api.loginWithFace(imageBase64);
        const data = response.data;

        if (data.status === 'success') {
          if (data.token) {
            try { localStorage.setItem('token', data.token); } catch (_) {}
          }
          setFaceStatus('success');
          setTimeout(() => {
            onLoginSuccess(data.user);
          }, 1000);
        }
      } catch (err) {
        console.error(err);
        setFaceStatus('error');
        setError(err.response?.data?.detail || t('auth.err.faceFail'));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRegChange = (e) => {
    setRegForm({ ...regForm, [e.target.name]: e.target.value });
  };

  const handleRegFileChange = (e) => {
    setRegFiles(Array.from(e.target.files));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.user_id || !regForm.name || !regForm.password) {
      setError(t('auth.err.fillRequired'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      // Chuyển đổi các file ảnh đã chọn sang Base64 (nếu có)
      let imagesBase64 = [];
      if (regFiles.length > 0) {
        imagesBase64 = await Promise.all(
          regFiles.map((file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
          )
        );
      }

      const response = await api.enrollUser({
        user_id: regForm.user_id,
        name: regForm.name,
        email: regForm.email || null,
        password: regForm.password,
        department: regForm.department || null,
        images_base64: imagesBase64,
      });

      setSuccessMsg(t('auth.ok.register'));
      // Reset form đăng ký
      setRegForm({
        user_id: '',
        name: '',
        email: '',
        password: '',
        department: '',
      });
      setRegFiles([]);
      // Tự động chuyển về tab đăng nhập sau 2 giây
      setTimeout(() => {
        setIsRegistering(false);
        setSuccessMsg('');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(formatErrorMsg(err, t('auth.err.registerFail')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <h2>{t('auth.portal')}</h2>
          <p>{isRegistering ? t('auth.createSubtitle') : t('auth.tagline')}</p>
        </div>

        {error && <div className="login-error-msg">{error}</div>}
        {successMsg && <div className="login-success-msg">{successMsg}</div>}

        {!isRegistering ? (
          <>
            <div className="login-tabs">
              <button
                className={`tab-btn ${loginMethod === 'password' ? 'active' : ''}`}
                onClick={() => { setLoginMethod('password'); setError(''); }}
              >
                🔑 {t('auth.tabPassword')}
              </button>
              <button
                className={`tab-btn ${loginMethod === 'face' ? 'active' : ''}`}
                onClick={() => { setLoginMethod('face'); setError(''); setFaceStatus('idle'); }}
              >
                📷 {t('auth.tabFace')}
              </button>
            </div>

            {loginMethod === 'password' ? (
              <form className="login-form" onSubmit={handlePasswordLogin}>
                <div className="input-group">
                  <label>{t('auth.usernameOrEmail')}</label>
                  <input
                    type="text"
                    placeholder={t('auth.ph.username')}
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="input-group">
                  <label>{t('auth.password')}</label>
                  <input
                    type="password"
                    placeholder={t('auth.ph.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <button type="submit" className="login-submit-btn" disabled={loading}>
                  {loading ? t('auth.submittingLogin') : t('auth.submitLogin')}
                </button>
              </form>
            ) : (
              <div className="login-face-section">
                <div className="login-camera-container">
                  <CameraBox onCapture={handleFaceCapture} captureTrigger={0} status={faceStatus} />
                </div>

                <div className="face-scan-status">
                  {faceStatus === 'idle' && <p className="status-text text-idle">{t('auth.faceCaptureHint')}</p>}
                  {faceStatus === 'scanning' && <p className="status-text text-scanning">{t('auth.faceScanning')}</p>}
                  {faceStatus === 'success' && <p className="status-text text-success">{t('auth.faceSuccess')}</p>}
                  {faceStatus === 'error' && <p className="status-text text-error">{t('auth.faceFail')}</p>}
                </div>
              </div>
            )}

            <div className="login-footer" style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
              <span>{t('auth.noAccount')} </span>
              <button
                className="login-toggle-btn"
                onClick={() => { setIsRegistering(true); setError(''); }}
              >
                {t('auth.goRegister')}
              </button>
            </div>
          </>
        ) : (
          /* Màn hình Đăng ký */
          <>
            <form className="login-form" onSubmit={handleRegister}>
              <div className="input-group">
                <label>{t('auth.regUsernameLabel')}</label>
                <input
                  type="text"
                  name="user_id"
                  placeholder={t('auth.ph.username_login')}
                  value={regForm.user_id}
                  onChange={handleRegChange}
                  disabled={loading}
                  required
                />
              </div>
              <div className="input-group">
                <label>{t('auth.regFullNameLabel')}</label>
                <input
                  type="text"
                  name="name"
                  placeholder={t('auth.ph.full_name')}
                  value={regForm.name}
                  onChange={handleRegChange}
                  disabled={loading}
                  required
                />
              </div>
              <div className="input-group">
                <label>{t('auth.regEmailLabel')}</label>
                <input
                  type="email"
                  name="email"
                  placeholder={t('auth.ph.email')}
                  value={regForm.email}
                  onChange={handleRegChange}
                  disabled={loading}
                />
              </div>
              <div className="input-group">
                <label>{t('auth.regPasswordLabel')}</label>
                <input
                  type="password"
                  name="password"
                  placeholder={t('auth.ph.set_password')}
                  value={regForm.password}
                  onChange={handleRegChange}
                  disabled={loading}
                  required
                />
              </div>
              <div className="input-group">
                <label>{t('auth.regDepartmentLabel')}</label>
                <input
                  type="text"
                  name="department"
                  placeholder={t('auth.ph.department')}
                  value={regForm.department}
                  onChange={handleRegChange}
                  disabled={loading}
                />
              </div>
              <div className="input-group">
                <label>{t('auth.regFaceLabel')}</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleRegFileChange}
                  disabled={loading}
                />
                <span className="login-helper-text">{t('auth.regFaceHint')}</span>
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? t('auth.submittingRegister') : t('auth.submitRegister')}
              </button>
            </form>

            <div className="login-footer" style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
              <span>{t('auth.haveAccount')} </span>
              <button
                className="login-toggle-btn"
                onClick={() => { setIsRegistering(false); setError(''); }}
              >
                {t('auth.goLogin')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}