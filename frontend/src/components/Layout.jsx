import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ConfirmModal from './ConfirmModal';

const basePageTitles = {
  '/bins': 'Bins Management',
  '/locations': 'Locations Management',
  '/categories': 'Waste Categories',
  '/teams': 'Teams & Crew Personnel',
  '/schedules': 'Collection Schedules',
  '/records': 'Collection Records History',
  '/reports': 'Reports & Analytics',
};

const Layout = ({ currentUser, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const role = currentUser?.role || 'Super Admin';

  // Dynamic Dashboard page title based on active role
  let currentTitle = basePageTitles[location.pathname] || 'Smart Waste Management';
  if (location.pathname === '/') {
    if (role === 'Municipal Officer') {
      currentTitle = 'Municipal Officer Inspection Portal';
    } else if (role === 'Dispatcher') {
      currentTitle = 'Field Dispatch & Fleet Control Center';
    } else {
      currentTitle = 'Administrator Command Center';
    }
  }

  const handleLogoutConfirm = () => {
    setIsLogoutModalOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      sessionStorage.removeItem('swm_user');
      navigate('/login');
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        isMobileOpen={isMobileOpen}
        closeMobileSidebar={() => setIsMobileOpen(false)}
        onLogoutClick={() => setIsLogoutModalOpen(true)}
        currentUser={currentUser}
      />

      <div className="main-wrapper">
        <Navbar
          pageTitle={currentTitle}
          toggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
          currentUser={currentUser}
        />
        <main className="content-body">
          <Outlet context={{ currentUser }} />
        </main>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to end your current session and return to the login screen?"
        confirmText="Sign Out"
        confirmVariant="danger"
      />
    </div>
  );
};

export default Layout;
