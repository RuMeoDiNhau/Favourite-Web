import React, { useState } from 'react';
import CameraBox from '../../components/CameraBox';
import * as api from '../../services/api';
import './Login.css';

export default function Login({ onLoginSuccess }) {
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

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) {
      setError('Vui lòng điền đầy đủ tài khoản và mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await api.loginWithPassword(usernameOrEmail, password);
      const data = response.data;
      
      if (data.status === 'success') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản/mật khẩu.');
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
          setFaceStatus('success');
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setTimeout(() => {
            onLoginSuccess(data.user);
          }, 1000);
        }
      } catch (err) {
        console.error(err);
        setFaceStatus('error');
        setError(err.response?.data?.detail || 'Không nhận diện được khuôn mặt. Vui lòng thử lại.');
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
      setError('Vui lòng điền đầy đủ các trường bắt buộc (Username, Họ tên, Mật khẩu).');
      return;
    }

    if (regFiles.length === 0) {
      setError('Vui lòng chọn hoặc chụp ít nhất 1 ảnh khuôn mặt để làm dữ liệu nhận dạng.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      // Chuyển đổi toàn bộ các file ảnh đã chọn sang Base64
      const imagesBase64 = await Promise.all(
        regFiles.map((file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
        )
      );

      const response = await api.enrollUser({
        user_id: regForm.user_id,
        name: regForm.name,
        email: regForm.email || null,
        password: regForm.password,
        department: regForm.department || null,
        images_base64: imagesBase64,
      });

      setSuccessMsg('Đăng ký tài khoản thành công! Bạn đã có thể đăng nhập bằng tài khoản này.');
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
      setError(err.response?.data?.detail || 'Đăng ký thất bại. Tên tài khoản hoặc email có thể đã tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <h2>Fav Web Portal</h2>
          <p>{isRegistering ? 'Tạo tài khoản thành viên mới' : 'Hệ thống nhận diện khuôn mặt & dịch vụ giải trí'}</p>
        </div>

        {error && <div className="login-error-msg">{error}</div>}
        {successMsg && <div className="login-success-msg" style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ade80', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', textAlign: 'center' }}>{successMsg}</div>}

        {!isRegistering ? (
          <>
            <div className="login-tabs">
              <button 
                className={`tab-btn ${loginMethod === 'password' ? 'active' : ''}`}
                onClick={() => { setLoginMethod('password'); setError(''); }}
              >
                🔑 Mật khẩu
              </button>
              <button 
                className={`tab-btn ${loginMethod === 'face' ? 'active' : ''}`}
                onClick={() => { setLoginMethod('face'); setError(''); setFaceStatus('idle'); }}
              >
                📷 Khuôn mặt
              </button>
            </div>

            {loginMethod === 'password' ? (
              <form className="login-form" onSubmit={handlePasswordLogin}>
                <div className="input-group">
                  <label>Tài khoản hoặc Email</label>
                  <input 
                    type="text" 
                    placeholder="Nhập username hoặc email..." 
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="input-group">
                  <label>Mật khẩu</label>
                  <input 
                    type="password" 
                    placeholder="Nhập mật khẩu..." 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <button type="submit" className="login-submit-btn" disabled={loading}>
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>
            ) : (
              <div className="login-face-section">
                <div className="login-camera-container">
                  <CameraBox onCapture={handleFaceCapture} captureTrigger={0} />
                </div>
                
                <div className="face-scan-status">
                  {faceStatus === 'idle' && <p className="status-text text-idle">Chụp ảnh khuôn mặt đã đăng ký để đăng nhập</p>}
                  {faceStatus === 'scanning' && <p className="status-text text-scanning">🔄 Đang nhận diện... Vui lòng giữ nguyên khuôn mặt</p>}
                  {faceStatus === 'success' && <p className="status-text text-success">✔️ Nhận dạng thành công! Đang chuyển hướng...</p>}
                  {faceStatus === 'error' && <p className="status-text text-error">❌ Nhận dạng thất bại. Hãy thử lại dưới điều kiện đủ ánh sáng.</p>}
                </div>
              </div>
            )}

            <div className="login-footer" style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
              <span>Chưa có tài khoản? </span>
              <button 
                onClick={() => { setIsRegistering(true); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: '600', padding: 0 }}
              >
                Đăng ký ngay
              </button>
            </div>
          </>
        ) : (
          /* Màn hình Đăng ký */
          <>
            <form className="login-form" onSubmit={handleRegister}>
              <div className="input-group">
                <label>Tên tài khoản (Username) *</label>
                <input 
                  type="text" 
                  name="user_id"
                  placeholder="Nhập username đăng nhập..." 
                  value={regForm.user_id}
                  onChange={handleRegChange}
                  disabled={loading}
                  required
                />
              </div>
              <div className="input-group">
                <label>Họ và tên *</label>
                <input 
                  type="text" 
                  name="name"
                  placeholder="Nhập họ tên đầy đủ..." 
                  value={regForm.name}
                  onChange={handleRegChange}
                  disabled={loading}
                  required
                />
              </div>
              <div className="input-group">
                <label>Địa chỉ Email</label>
                <input 
                  type="email" 
                  name="email"
                  placeholder="Nhập email (ví dụ: name@gmail.com)..." 
                  value={regForm.email}
                  onChange={handleRegChange}
                  disabled={loading}
                />
              </div>
              <div className="input-group">
                <label>Mật khẩu *</label>
                <input 
                  type="password" 
                  name="password"
                  placeholder="Thiết lập mật khẩu..." 
                  value={regForm.password}
                  onChange={handleRegChange}
                  disabled={loading}
                  required
                />
              </div>
              <div className="input-group">
                <label>Khoa / Bộ phận</label>
                <input 
                  type="text" 
                  name="department"
                  placeholder="Nhập khoa hoặc phòng ban..." 
                  value={regForm.department}
                  onChange={handleRegChange}
                  disabled={loading}
                />
              </div>
              <div className="input-group">
                <label>Ảnh chụp khuôn mặt *</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleRegFileChange}
                  disabled={loading}
                  required
                />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Chọn ít nhất 1 ảnh khuôn mặt rõ nét để nhận dạng</span>
              </div>
              
              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}
              </button>
            </form>

            <div className="login-footer" style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
              <span>Đã có tài khoản? </span>
              <button 
                onClick={() => { setIsRegistering(false); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: '600', padding: 0 }}
              >
                Đăng nhập
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
