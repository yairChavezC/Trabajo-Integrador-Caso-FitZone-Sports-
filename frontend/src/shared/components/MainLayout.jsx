import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { SedeSelector } from './SedeSelector';
import { NavTabs } from './NavTabs';
import { UserProfileCard } from './UserProfileCard';
import './MainLayout.css';

export function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login', { replace: true });
  };

  return (
    <div className="layout-root">
      <header className="topbar">
        {/* Brand / Logo */}
        <div className="topbar-brand">
          <div className="brand-badge">FZ</div>
          <div className="brand-text">
            <div className="brand-title">
              FITZONE <span className="brand-tag">SPORTS</span>
            </div>
            <span className="brand-subtitle">Red Provincial • 25+ Sedes</span>
          </div>
        </div>

        {/* Componentes modulares */}
        <SedeSelector />
        <NavTabs />
        <UserProfileCard onLogout={handleLogout} />
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}