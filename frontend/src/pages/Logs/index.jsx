import React, { useEffect, useState } from 'react';
import { fetchLogs } from '../../services/api';

function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs()
      .then((response) => {
        setLogs(response.data?.data || []);
      })
      .catch(() => {
        setLogs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <section className="page">
      <h2>Logs / History</h2>
      {loading ? (
        <p>Đang tải lịch sử...</p>
      ) : (
        <table className="user-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>User ID</th>
              <th>Tên</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
              <th>Ảnh</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.log_id}>
                  <td>{log.log_id}</td>
                  <td>{log.user_id}</td>
                  <td>{log.name}</td>
                  <td>{log.status}</td>
                  <td>{log.timestamp}</td>
                  <td>
                    {log.captured_image_url ? (
                      <a href={log.captured_image_url} target="_blank" rel="noreferrer">
                        Xem
                      </a>
                    ) : (
                      'Không có'
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">Không có lịch sử quét nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default Logs;
