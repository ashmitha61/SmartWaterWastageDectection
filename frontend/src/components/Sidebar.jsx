import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Trash2,
  MapPin,
  Layers,
  Users,
  CalendarDays,
  ClipboardList,
  BarChart3,
  LogOut,
  Recycle,
  Shield,
  Building2,
  Truck
} from 'lucide-react';

const Sidebar = ({ isMobileOpen, closeMobileSidebar, onLogoutClick, currentUser }) => {
  const role = currentUser?.role || 'Super Admin';

  // Role-specific navigation items
  let navItems = [];
  let brandTitle = 'EcoSmart Waste';
  let brandSubtitle = 'Super Admin Console';
  let RoleIcon = Shield;

  if (role === 'Municipal Officer') {
    brandTitle = 'EcoSmart Municipal';
    brandSubtitle = 'Officer Inspection Portal';
    RoleIcon = Building2;
    navItems = [
      { path: '/', label: 'Officer Dashboard', icon: LayoutDashboard },
      { path: '/locations', label: 'Ward Locations', icon: MapPin },
      { path: '/bins', label: 'Bins & Fill Levels', icon: Trash2 },
      { path: '/categories', label: 'Waste Categories', icon: Layers },
      { path: '/reports', label: 'Sanitation Reports', icon: BarChart3 },
    ];
  } else if (role === 'Dispatcher') {
    brandTitle = 'EcoSmart Dispatch';
    brandSubtitle = 'Fleet Operations Hub';
    RoleIcon = Truck;
    navItems = [
      { path: '/', label: 'Dispatch Center', icon: LayoutDashboard },
      { path: '/schedules', label: 'Collection Schedules', icon: CalendarDays },
      { path: '/records', label: 'Log Collections', icon: ClipboardList },
      { path: '/teams', label: 'Field Teams & Crews', icon: Users },
      { path: '/bins', label: 'Overfill Bin Alerts', icon: Trash2 },
    ];
  } else {
    // Super Admin sees all system modules
    brandTitle = 'EcoSmart Waste';
    brandSubtitle = 'Super Admin Console';
    RoleIcon = Shield;
    navItems = [
      { path: '/', label: 'Admin Dashboard', icon: LayoutDashboard },
      { path: '/bins', label: 'Bins Management', icon: Trash2 },
      { path: '/locations', label: 'Locations', icon: MapPin },
      { path: '/categories', label: 'Waste Categories', icon: Layers },
      { path: '/teams', label: 'Teams Management', icon: Users },
      { path: '/schedules', label: 'Collection Schedules', icon: CalendarDays },
      { path: '/records', label: 'Collection Records', icon: ClipboardList },
      { path: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
    ];
  }

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-icon-box">
          <Recycle size={26} strokeWidth={2.2} />
        </div>
        <div className="brand-text">
          <h1>{brandTitle}</h1>
          <span>{brandSubtitle}</span>
        </div>
      </div>

      {/* Active User Pill in Sidebar */}
      <div
        style={{
          margin: '12px 14px 16px',
          padding: '10px 12px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0,
          }}
        >
          <RoleIcon size={17} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentUser?.full_name || 'Administrator'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#86efac', fontWeight: 600 }}>
            {role}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <span className="nav-section-title">
          {role === 'Municipal Officer'
            ? 'Officer Controls'
            : role === 'Dispatcher'
            ? 'Fleet Dispatch Tools'
            : 'System Governance'}
        </span>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={closeMobileSidebar}
            >
              <Icon size={19} className="nav-icon" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <span className="nav-section-title" style={{ marginTop: '16px' }}>Account</span>
        <button
          type="button"
          className="nav-item"
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
          onClick={onLogoutClick}
        >
          <LogOut size={19} className="nav-icon" style={{ color: '#f87171' }} />
          <span style={{ color: '#fca5a5' }}>Sign Out</span>
        </button>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer" style={{ padding: '12px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: '0.74rem', color: '#86efac', fontWeight: 600 }}>
          {role} Workspace
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;
