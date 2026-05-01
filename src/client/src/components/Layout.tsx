import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import Icons from './Icons';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Icons.Grid, path: '/' },
  { id: 'appointments', label: 'Appointments', icon: Icons.Calendar, path: '/appointments' },
  { id: 'doctors', label: 'Doctors', icon: Icons.Stethoscope, path: '/doctors' },
  { id: 'patients', label: 'Patients', icon: Icons.Users, path: '/patients' },
  { id: 'analytics', label: 'Analytics', icon: Icons.Activity, path: '/analytics' },
  { id: 'campaigns', label: 'Campaigns', icon: Icons.Phone, path: '/campaigns' },
  { id: 'settings', label: 'Settings', icon: Icons.Settings, path: '/settings' },
];

export function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const currentPage = navItems.find(n => n.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <div className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
            <span></span><span></span><span></span>
          </div>
        </button>
        <div className="mobile-brand">
          <Icons.Stethoscope />
          <span>MediVoice</span>
        </div>
        <div className="mobile-avatar">AM</div>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Icons.Stethoscope />
          </div>
          <div className="brand-text">
            <h1>MediVoice</h1>
            <span>Clinical Intelligence</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="nav-icon"><item.icon /></span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-pill">
            <span className="status-dot"></span>
            <span>System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header">
          <div className="header-title">
            <h2>{currentPage}</h2>
            <p className="header-breadcrumb">MediVoice / {currentPage}</p>
          </div>
          <div className="header-actions">
            <button className="header-btn" aria-label="Search">
              <Icons.Search />
            </button>
            <button className="header-btn" aria-label="Notifications">
              <Icons.Bell />
            </button>
            <div className="header-avatar">
              <div className="avatar-img">AM</div>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}
    </div>
  );
}
