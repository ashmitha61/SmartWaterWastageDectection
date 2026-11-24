import React, { useState, useEffect } from 'react';
import { Bell, Menu, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

const Navbar = ({ pageTitle, toggleMobileSidebar, currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState('Checking...');

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 20000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await api.dashboard.getStats();
      if (res.success) {
        setNotifications(res.data.urgentBins || []);
        setDbStatus('Connected');
      }
    } catch {
      setDbStatus('Offline');
    }
  };

  const displayName = currentUser?.full_name || 'Ashmitha (Admin)';
  const displayRole = currentUser?.role || 'Super Admin';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="btn-icon mobile-menu-btn"
          onClick={toggleMobileSidebar}
          style={{ display: 'none' }}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>
        <div>
          <h2 className="page-title">{pageTitle}</h2>
        </div>
      </div>

      <div className="navbar-right">
        {/* Live DB Connection Badge */}
        <div className="live-badge" title="Backend & MySQL Connection Status">
          <span className="live-dot" style={{ backgroundColor: dbStatus === 'Connected' ? '#22c55e' : '#ef4444' }}></span>
          <span>{dbStatus === 'Connected' ? 'MySQL Live' : 'Database Offline'}</span>
        </div>

        {/* Refresh Data Quick Button */}
        <button
          type="button"
          className="nav-icon-btn"
          onClick={fetchAlerts}
          title="Refresh real-time data"
        >
          <RefreshCw size={18} />
        </button>

        {/* Notification Icon with Dropdown for Urgent Bins */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="nav-icon-btn"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            title="Notifications & Overflow Alerts"
          >
            <Bell size={19} />
            {notifications.length > 0 && (
              <span className="notification-count">{notifications.length}</span>
            )}
          </button>

          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '50px',
                width: '320px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                border: '1px solid #e2e8f0',
                padding: '16px',
                zIndex: 100,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>Critical Bin Alerts</h4>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Fill Level &ge; 80%</span>
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: '16px 0', textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>
                  <CheckCircle size={24} color="#22c55e" style={{ margin: '0 auto 6px' }} />
                  <p>All bins are within safe capacity.</p>
                </div>
              ) : (
                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {notifications.map((bin) => (
                    <div
                      key={bin.bin_id}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#fef2f2',
                        borderLeft: '4px solid #ef4444',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#991b1b' }}>
                        <span>{bin.bin_code}</span>
                        <span>{bin.fill_level}% full</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#7f1d1d', marginTop: '2px' }}>
                        {bin.area_name} &bull; {bin.category_name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin Profile */}
        <div className="user-profile">
          <div className="user-avatar" title={displayName}>
            {initials}
          </div>
          <div className="user-details">
            <span className="user-name">{displayName}</span>
            <span className="user-role">{displayRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
