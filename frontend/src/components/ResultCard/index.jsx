import React from 'react';

function ResultCard({ status, message }) {
  return (
    <div>
      <strong>{status}</strong>
      <p>{message}</p>
    </div>
  );
}

export default ResultCard;
