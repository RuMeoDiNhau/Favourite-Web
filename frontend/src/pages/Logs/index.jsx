import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchLogs } from '../../services/api';

function Logs() {
  const { t } = useTranslation();
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
      <h2>{t('logs.title')}</h2>
      {loading ? (
        <p>{t('logs.loading')}</p>
      ) : (
        <table className="user-table">
          <thead>
            <tr>
              <th>{t('logs.logId')}</th>
              <th>{t('logs.userId')}</th>
              <th>{t('logs.name')}</th>
              <th>{t('logs.status')}</th>
              <th>{t('logs.time')}</th>
              <th>{t('logs.photo')}</th>
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
                        {t('logs.view')}
                      </a>
                    ) : (
                      t('logs.none')
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">{t('logs.empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default Logs;