import React, { useEffect, useState } from 'react';
import { fetchUsers, enrollUser } from '../../services/api';
import { useTranslation } from 'react-i18next';

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
    setMessage(t('users.enrolling'));
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
      setMessage(response.data.message || t('users.ok.enrolled'));
      setForm({ user_id: '', name: '', email: '', password: '', department: '' });
      setFiles([]);
      loadUsers();
    } catch (error) {
      setMessage(error.response?.data?.detail || t('users.fail.enrolled'));
    }
  };

  return (
    <section className="page">
      <h2>{t('users.title')}</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
          <input
            type="text"
            name="user_id"
            value={form.user_id}
            onChange={handleChange}
            placeholder={t('users.ph.username')}
            required
          />
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder={t('users.ph.full_name')}
            required
          />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder={t('users.ph.email')}
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder={t('users.ph.password')}
          />
          <input
            type="text"
            name="department"
            value={form.department}
            onChange={handleChange}
            placeholder={t('users.ph.department')}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {t('users.photoLabel')}
            </label>
            <input type="file" accept="image/*" multiple onChange={handleFileChange} />
          </div>
          <button className="button" type="submit">
            {t('users.enrollBtn')}
          </button>
        </div>
        {message && <p>{message}</p>}
      </form>

      {loading ? (
        <p>{t('users.loading')}</p>
      ) : (
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('users.nameCol')}</th>
              <th>{t('users.photoCount')}</th>
              <th>{t('users.createdAt')}</th>
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
                <td colSpan="4">{t('users.noUsers')}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default Users;