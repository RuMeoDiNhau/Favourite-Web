import React, { useEffect, useState } from 'react';
import { fetchLogs } from '../../services/api';
import T from '../../i18n/T';

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
        <p><T>Đang tải lịch sử...</T></p>
      ) : (
        <table className="user-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>User ID</th>
              <th><T>Tên</T></th>
              <th><T>Trạng thái</T></th>
              <th><T>Thời gian</T></th>
              <th><T>Ảnh</T></th>
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
                        <T>Xem</T>
                      </a>
                    ) : (
                      <T>Không có</T>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6"><T>Không có lịch sử quét nào.</T></td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default Logs;
