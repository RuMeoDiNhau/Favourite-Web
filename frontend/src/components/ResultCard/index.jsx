import React from 'react';
import { useTranslation } from 'react-i18next';
import './ResultCard.css';

function ResultCard({ status, message }) {
  const { t } = useTranslation();
  const label = t(`dashboard.result.${status}`, { defaultValue: status });
  return (
    <div className={`result-card result-card--${status}`}>
      <strong>{label}</strong>
      <p>{message}</p>
    </div>
  );
}

export default ResultCard;