import React from 'react';

const FillProgressBar = ({ level = 0 }) => {
  const percentage = Math.min(100, Math.max(0, parseFloat(level) || 0));

  let fillColor = '#22c55e'; // Green
  let textColor = '#15803d';

  if (percentage >= 80) {
    fillColor = '#ef4444'; // Red
    textColor = '#b91c1c';
  } else if (percentage >= 50) {
    fillColor = '#f59e0b'; // Amber
    textColor = '#b45309';
  }

  return (
    <div className="progress-bar-container" title={`Fill level: ${percentage.toFixed(1)}%`}>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: fillColor,
          }}
        />
      </div>
      <span className="progress-label" style={{ color: textColor }}>
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
};

export default FillProgressBar;
