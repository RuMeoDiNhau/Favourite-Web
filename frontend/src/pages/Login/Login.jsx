import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CameraBox from '../../components/CameraBox';
import * as api from '../../services/api';
import T from '../../i18n/T';
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
      setError(t('login.err.fill_all', { defaultValue: 'Vui lòng điền đầy đủ tài khoản và mật khẩu.' }));
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
      setError(formatErrorMsg(err, t('login.err.password_fail', { defaultValue: 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản/mật khẩu.' })));
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
        setError(err.response?.data?.detail || t('login.err.face_fail', { defaultValue: 'Không nhận diện được khuôn mặt. Vui lòng thử lại.' }));
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
      setError(t('login.err.fill_required', { defaultValue: 'Vui lòng điền đầy đủ các trường bắt buộc (Username, Họ tên, Mật khẩu).' }));
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

      setSuccessMsg(t('login.success.register', { defaultValue: 'Đăng ký tài khoản thành công! Bạn đã có thể đăng nhập bằng tài khoản này.' }));
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
      setError(formatErrorMsg(err, t('login.err.register_fail', { defaultValue: 'Đăng ký thất bại. Tên tài khoản hoặc email có thể đã tồn tại.' })));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <h2><T>Fav Web Portal</T></h2>
          <p>{isRegistering ? <T>Tạo tài khoản thành viên mới</T> : <T>Hệ thống nhận diện khuôn mặt & dịch vụ giải trí</T>}</p>
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
                🔑 <T>Mật khẩu</T>
              </button>
              <button
                className={`tab-btn ${loginMethod === 'face' ? 'active' : ''}`}
                onClick={() => { setLoginMethod('face'); setError(''); setFaceStatus('idle'); }}
              >
                📷 <T>Khuôn mặt</T>
              </button>
            </div>

            {loginMethod === 'password' ? (
              <form className="login-form" onSubmit={handlePasswordLogin}>
                <div className="input-group">
                  <label><T>Tài khoản hoặc Email</T></label>
                  <input
                    type="text"
                    placeholder={t('login.ph.username', { defaultValue: 'Nhập username hoặc email...' })}
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="input-group">
                  <label><T>Mật khẩu</T></label>
                  <input
                    type="password"
                    placeholder={t('login.ph.password', { defaultValue: 'Nhập mật khẩu...' })}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <button type="submit" className="login-submit-btn" disabled={loading}>
                  {loading ? <T>Đang đăng nhập...</T> : <T>Đăng nhập</T>}
                </button>
              </form>
            ) : (
              <div className="login-face-section">
                <div className="login-camera-container">
                  <CameraBox onCapture={handleFaceCapture} captureTrigger={0} status={faceStatus} />
                </div>
                
                <div className="face-scan-status">
                  {faceStatus === 'idle' && <p className="status-text text-idle"><T>Chụp ảnh khuôn mặt đã đăng ký để đăng nhập</T></p>}
                  {faceStatus === 'scanning' && <p className="status-text text-scanning"><T>🔄 Đang nhận diện... Vui lòng giữ nguyên khuôn mặt</T></p>}
                  {faceStatus === 'success' && <p className="status-text text-success"><T>✔️ Nhận dạng thành công! Đang chuyển hướng...</T></p>}
                  {faceStatus === 'error' && <p className="status-text text-error"><T>❌ Nhận dạng thất bại. Hãy thử lại dưới điều kiện đủ ánh sáng.</T></p>}
                </div>
              </div>
            )}

            <div className="login-footer" style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
              <span><T>Chưa có tài khoản?</T> </span>
              <button
                className="login-toggle-btn"
                onClick={() => { setIsRegistering(true); setError(''); }}
              >
                <T>Đăng ký ngay</T>
              </button>
            </div>
          </>
        ) : (
          /* Màn hình Đăng ký */
          <>
            <form className="login-form" onSubmit={handleRegister}>
              <div className="input-group">
                <label><T>Tên tài khoản (Username) *</T></label>
                <input
                  type="text"
                  name="user_id"
                  placeholder={t('login.ph.username_login', { defaultValue: 'Nhập username đăng nhập...' })}
                  value={regForm.user_id}
                  onChange={handleRegChange}
                  disabled={loading}
                  required
                />
              </div>
              <div className="input-group">
                <label><T>Họ và tên *</T></label>
                <input
                  type="text"
                  name="name"
                  placeholder={t('login.ph.full_name', { defaultValue: 'Nhập họ tên đầy đủ...' })}
                  value={regForm.name}
                  onChange={handleRegChange}
                  disabled={loading}
                  required
                />
              </div>
              <div className="input-group">
                <label><T>Địa chỉ Email</T></label>
                <input
                  type="email"
                  name="email"
                  placeholder={t('login.ph.email', { defaultValue: 'Nhập email (ví dụ: name@gmail.com)...' })}
                  value={regForm.email}
                  onChange={handleRegChange}
                  disabled={loading}
                />
              </div>
              <div className="input-group">
                <label><T>Mật khẩu *</T></label>
                <input
                  type="password"
                  name="password"
                  placeholder={t('login.ph.set_password', { defaultValue: 'Thiết lập mật khẩu...' })}
                  value={regForm.password}
                  onChange={handleRegChange}
                  disabled={loading}
                  required
                />
              </div>
              <div className="input-group">
                <label><T>Khoa / Bộ phận</T></label>
                <input
                  type="text"
                  name="department"
                  placeholder={t('login.ph.department', { defaultValue: 'Nhập khoa hoặc phòng ban...' })}
                  value={regForm.department}
                  onChange={handleRegChange}
                  disabled={loading}
                />
              </div>
              <div className="input-group">
                <label><T>Ảnh chụp khuôn mặt (Không bắt buộc)</T></label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleRegFileChange}
                  disabled={loading}
                />
                <span className="login-helper-text"><T>Không bắt buộc. Chọn ít nhất 1 ảnh rõ nét nếu muốn đăng nhập bằng khuôn mặt</T></span>
              </div>

              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? <T>Đang tạo tài khoản...</T> : <T>Đăng ký tài khoản</T>}
              </button>
            </form>

            <div className="login-footer" style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
              <span><T>Đã có tài khoản?</T> </span>
              <button
                className="login-toggle-btn"
                onClick={() => { setIsRegistering(false); setError(''); }}
              >
                <T>Đăng nhập</T>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
