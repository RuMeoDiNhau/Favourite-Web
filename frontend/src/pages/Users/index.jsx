import React, { useEffect, useState } from 'react';
import { fetchUsers, enrollUser } from '../../services/api';
import { useTranslation } from 'react-i18next';
import T from '../../i18n/T';

function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ user_id: '', name: '', email: '', password: '', department: '' });
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');

  const loadUsers = () => {
    setLoading(true);
    fetchUsers()
      .then((response) => {
        const data = response.data?.data || [];
        setUsers(data);
      })
      .catch(() => {
        setUsers([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(t('users.enrolling', { defaultValue: 'Đang đăng ký người dùng...' }));
    try {
      const imagesBase64 = await Promise.all(
        files.map((file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
        )
      );

      const response = await enrollUser({
        user_id: form.user_id,
        name: form.name,
        email: form.email || null,
        password: form.password || null,
        department: form.department,
        images_base64: imagesBase64,
      });
      setMessage(response.data.message || t('users.enrolled_ok', { defaultValue: 'Đăng ký thành công' }));
      setForm({ user_id: '', name: '', email: '', password: '', department: '' });
      setFiles([]);
      loadUsers();
    } catch (error) {
      setMessage(error.response?.data?.detail || t('users.enrolled_err', { defaultValue: 'Đăng ký thất bại.' }));
    }
  };

  return (
    <section className="page">
      <h2><T>Quản lý Người dùng</T></h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
          <input
            type="text"
            name="user_id"
            value={form.user_id}
            onChange={handleChange}
            placeholder={t('users.ph.username', { defaultValue: 'Username (Mã nhân viên / sinh viên)' })}
            required
          />
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder={t('users.ph.full_name', { defaultValue: 'Tên đầy đủ' })}
            required
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder={t('users.ph.email', { defaultValue: 'Địa chỉ Email' })}
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder={t('users.ph.password', { defaultValue: 'Mật khẩu đăng nhập' })}
          />
          <input
            type="text"
            name="department"
            value={form.department}
            onChange={handleChange}
            placeholder={t('users.ph.department', { defaultValue: 'Khoa / Bộ phận' })}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <T>Ảnh đăng ký khuôn mặt (Tùy chọn - Dùng cho Face ID):</T>
            </label>
            <input type="file" accept="image/*" multiple onChange={handleFileChange} />
          </div>
          <button className="button" type="submit">
            <T>Đăng ký tài khoản mới</T>
          </button>
        </div>
        {message && <p>{message}</p>}
      </form>

      {loading ? (
        <p><T>Đang tải dữ liệu...</T></p>
      ) : (
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th><T>Tên</T></th>
              <th><T>Số ảnh</T></th>
              <th><T>Ngày tạo</T></th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.user_id}>
                  <td>{user.user_id}</td>
                  <td>{user.name}</td>
                  <td>{user.registered_images}</td>
                  <td>{user.created_at}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4"><T>Không có người dùng nào.</T></td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default Users;
