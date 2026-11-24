import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = '#2e7d32', bgColor = '#e8f5e9', subtext }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon-wrapper" style={{ backgroundColor: bgColor, color }}>
        <Icon size={24} />
      </div>
      <div className="stat-info">
        <span className="stat-label">{title}</span>
        <span className="stat-value">{value}</span>
        {subtext && <span className="stat-subtext">{subtext}</span>}
      </div>
    </div>
  );
};

export default StatCard;
