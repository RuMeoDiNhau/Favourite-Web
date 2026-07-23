import React from 'react';
import { useTranslation } from 'react-i18next';
import T from '../../i18n/T';
import './ResultCard.css';

const STATUS_LABELS = {
  idle: 'Idle',
  loading: 'Loading',
  scanning: 'Scanning',
  success: 'Success',
  error: 'Error',
};

function ResultCard({ status, message }) {
  const { t } = useTranslation();
  const label = t(`dashboard.result.${status}`, { defaultValue: STATUS_LABELS[status] || status });
  return (
    <div className={`result-card result-card--${status}`}>
      <strong>{label}</strong>
      <p>{message}</p>
    </div>
  );
}

export default ResultCard;
