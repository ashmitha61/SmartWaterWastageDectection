import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bins from './pages/Bins';
import Locations from './pages/Locations';
import Categories from './pages/Categories';
import Teams from './pages/Teams';
import Schedules from './pages/Schedules';
import Records from './pages/Records';
import Reports from './pages/Reports';

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('swm_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    sessionStorage.setItem('swm_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('swm_user');
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="/"
          element={
            currentUser ? (
              <Layout currentUser={currentUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="bins" element={<Bins />} />
          <Route path="locations" element={<Locations />} />
          <Route path="categories" element={<Categories />} />
          <Route path="teams" element={<Teams />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="records" element={<Records />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
