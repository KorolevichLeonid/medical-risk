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
  const [showReturn, setShowReturn] = useState(false);

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
    const onScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowReturn(scrollTop > 100);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
          <div className={`user-avatar ${(!user?.avatar || String(user?.avatar).includes('/api/placeholder')) ? 'default-avatar' : ''}`}>
            {(!user?.avatar || String(user?.avatar).includes('/api/placeholder')) ? (
              <div className="avatar-circle"><div className="avatar-person"></div></div>
            ) : (
              <img src={user?.avatar} alt={user?.name || 'User'} />
            )}
          </div>
          <div className="user-info">
            <h3>{user?.name || 'Loading...'}</h3>
            <p>Role: {user?.role || 'Role not set'}</p>
          </div>
          <button className="change-account-btn" onClick={handleLogout}>Logout</button>
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

        {/* Return to site button under Changelog */}
        <button onClick={() => navigate('/')} className="back-btn">Return to site</button>

        {/* Project View toggle button - only on project pages */}
        {location.pathname.match(/^\/project\/[^\/]+$/) && (
          <button onClick={() => navigate(`${location.pathname}/table`)} className="back-btn project-table-btn">
            📊 View as Table
          </button>
        )}
        {location.pathname.includes('/table') && (
          <button onClick={() => navigate(location.pathname.replace('/table', ''))} className="back-btn project-table-btn">
            👁️ View Details
          </button>
        )}

        {/* Support */}
        <div className="support-section">
          <div className="support-icon">?</div>
          <span>Support</span>
        </div>

        {/* Logout */}
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-body">
          {children}
        </div>
      </div>

      {/* Support Button - доступен на всех страницах с Layout */}
      <SupportButton />

      {/* floating return in cabinet убран по требованию */}

      {/* Fixed top controls */}
      <div className="notification-icon"></div>
    </div>
  );
};

export default Layout;
