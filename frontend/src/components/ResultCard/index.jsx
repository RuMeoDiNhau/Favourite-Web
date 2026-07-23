import React from 'react';
import './ResultCard.css';

function ResultCard({ status, message }) {
  return (
    <div className={`result-card result-card--${status}`}>
      <strong>{status}</strong>
      <p>{message}</p>
    </div>
  );
}

export default ResultCard;
