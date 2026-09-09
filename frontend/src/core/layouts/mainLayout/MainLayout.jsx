import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SedeSelector } from './SedeSelector';
import { NavTabs } from './NavTabs';
import { UserProfileCard } from './UserProfileCard';
import './MainLayout.css';

export function MainLayout() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  return (
    <div className="layout-root">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-badge">FZ</div>
          <div className="brand-text">
            <span className="brand-title">
              FITZONE <span className="brand-tag">SPORTS</span>
            </span>
            <span className="brand-subtitle">Red Provincial</span>
          </div>
        </div>
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

export { MainLayout as Layout };
export default MainLayout;