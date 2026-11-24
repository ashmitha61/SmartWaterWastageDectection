import React from 'react';

const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = status.toLowerCase().replace(/\s+/g, '');
  let badgeClass = 'badge-inactive';

  switch (normalized) {
    case 'active':
      badgeClass = 'badge-active';
      break;
    case 'inactive':
      badgeClass = 'badge-inactive';
      break;
    case 'maintenance':
      badgeClass = 'badge-maintenance';
      break;
    case 'pending':
      badgeClass = 'badge-pending';
      break;
    case 'inprogress':
      badgeClass = 'badge-inprogress';
      break;
    case 'completed':
      badgeClass = 'badge-completed';
      break;
    case 'cancelled':
      badgeClass = 'badge-cancelled';
      break;
    case 'onduty':
      badgeClass = 'badge-onduty';
      break;
    default:
      badgeClass = 'badge-inactive';
  }

  return <span className={`badge ${badgeClass}`}>{status}</span>;
};

export default StatusBadge;
