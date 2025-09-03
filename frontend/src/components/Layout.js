import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import SupportButton from './SupportButton';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { instance } = useMsal();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser({
        name: `${parsedUser.first_name} ${parsedUser.last_name}`,
        role: parsedUser.role,
        email: parsedUser.email,
        avatar: parsedUser.avatar_url || '/api/placeholder/50/50'
      });
    }
  }, []);

  const getMenuItems = () => {
    const baseItems = [
      { path: '/account', label: 'Personal account', icon: '👤' },
      { path: '/dashboard', label: 'Projects', icon: '📊' },
    ];

    // Role management: SYS_ADMIN sees all users, USER sees project participants
    baseItems.push({ path: '/roles', label: 'Role management', icon: '⚙️' });

    // Changelog: SYS_ADMIN sees all logs, USER sees own project logs
    baseItems.push({ path: '/changelog', label: 'Changelog', icon: '📝' });

    return baseItems;
  };

  const menuItems = getMenuItems();

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Try Azure logout first, but always redirect to home
    try {
      instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin + '/'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Always redirect to home page as fallback
    setTimeout(() => {
      navigate('/');
    }, 100);
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <div className="sidebar">
        {/* User Profile */}
        <div className="user-profile">
          <div className="user-avatar">
            <img src={user?.avatar || '/api/placeholder/50/50'} alt={user?.name || 'User'} />
          </div>
          <div className="user-info">
            <h3>{user?.name || 'Loading...'}</h3>
            <p>Role: {user?.role || 'Роль не назначена'}</p>
          </div>
          <button className="change-account-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="nav-menu">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Support */}
        <div className="support-section">
          <div className="support-icon">?</div>
          <span>Support</span>
        </div>

        {/* Logout */}
        <button className="logout-btn" onClick={handleLogout}>
          return
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-header">
          <div className="breadcrumb">
            <button onClick={() => navigate(-1)} className="back-btn">
              ← return
            </button>
          </div>
          <div className="user-actions">
            <div className="notification-icon">🔔</div>
            <div className="user-menu">
              <img src={user?.avatar || '/api/placeholder/50/50'} alt={user?.name || 'User'} className="user-avatar-small" />
            </div>
          </div>
        </div>
        <div className="content-body">
          {children}
        </div>
      </div>

      {/* Support Button - доступен на всех страницах с Layout */}
      <SupportButton />
    </div>
  );
};

export default Layout;