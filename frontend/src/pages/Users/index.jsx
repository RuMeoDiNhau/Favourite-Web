import React, { useEffect, useState } from 'react';
import { fetchUsers, enrollUser } from '../../services/api';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ user_id: '', name: '', department: '' });
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
    setMessage('Đang đăng ký người dùng...');
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
        department: form.department,
        images_base64: imagesBase64,
      });
      setMessage(response.data.message || 'Đăng ký thành công');
      setForm({ user_id: '', name: '', department: '' });
      setFiles([]);
      loadUsers();
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Đăng ký thất bại.');
    }
  };

  return (
    <section className="page">
      <h2>Quản lý Người dùng</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
          <input
            type="text"
            name="user_id"
            value={form.user_id}
            onChange={handleChange}
            placeholder="Mã nhân viên / sinh viên"
            required
          />
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Tên đầy đủ"
            required
          />
          <input
            type="text"
            name="department"
            value={form.department}
            onChange={handleChange}
            placeholder="Khoa / Bộ phận"
          />
          <input type="file" accept="image/*" multiple onChange={handleFileChange} />
          <button className="button" type="submit" disabled={files.length === 0}>
            Đăng ký mặt mới
          </button>
        </div>
        {message && <p>{message}</p>}
      </form>

      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : (
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Số ảnh</th>
              <th>Ngày tạo</th>
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
                <td colSpan="4">Không có người dùng nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default Users;
