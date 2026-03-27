import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import SupportButton from './SupportButton';
import arrowIcon from '../assets/figma/angle-circle-left.png';
import logoImage from '../assets/figma/logo.png';
import logoCutImage from '../assets/figma/logocut.png';
import API_BASE_URL from '../config';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { instance } = useMsal();
  const [user, setUser] = useState(null);
  const [showReturn, setShowReturn] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isSidebarCollapsed = !isHovered;
  const hoverTimeoutRef = useRef(null);
  const [projects, setProjects] = useState([]);
  const [projectsExpanded, setProjectsExpanded] = useState(false);

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

    // Load projects for dropdown
    loadProjects();

    const onScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowReturn(scrollTop > 100);
    };
    window.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const projectsData = await response.json();
        // Show all projects for sidebar display
        const formattedProjects = projectsData.map(project => ({
          id: project.id,
          name: project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name,
          fullName: project.name
        }));
        setProjects(formattedProjects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsHovered(true), 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setIsHovered(false), 300);
  };

  const toggleProjectsDropdown = () => {
    setProjectsExpanded(!projectsExpanded);
  };

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

  // Определение активного пункта меню на основе текущего пути
  const getActiveMenuItem = () => {
    const path = location.pathname;

    if (path === '/' || path === '/home') return 'home';
    if (path === '/search') return 'search';
    if (path === '/dashboard' || path.startsWith('/project/')) return 'projects';
    if (path === '/changelog') return 'changelog';
    if (path === '/account') return 'account';

    // Для других страниц можно добавить логику позже
    return null;
  };

  const activeMenuItem = getActiveMenuItem();

  console.log('isSidebarCollapsed:', isSidebarCollapsed);

  return (
    <div id="main-layout" className={`layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <div
        className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* User Profile Container */}
        {user && (
          <div
            className={`user-profile-container ${activeMenuItem === 'account' ? 'active' : ''}`}
            onClick={() => navigate('/account')}
          >
            {user.avatar && user.avatar !== '/api/placeholder/50/50' && user.avatar !== '/api/placeholder/40/40' ? (
              <img
                src={user.avatar}
                alt="User Avatar"
                className="user-profile-avatar"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
            ) : null}
            <div
              className="user-profile-avatar default-avatar"
              style={{
                display: (!user.avatar || user.avatar === '/api/placeholder/50/50' || user.avatar === '/api/placeholder/40/40') ? 'flex' : 'none',
                backgroundColor: '#8b9dc3',
                borderRadius: '50%',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                fontWeight: '600',
                border: '2px solid #8b9dc3'
              }}
            >
              {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
            </div>
            <div className="user-profile-info">
              <div className="user-profile-name">
                {user.name}
              </div>
              <div className="user-profile-role">
                {user.role?.toLowerCase()}
              </div>
            </div>
          </div>
        )}

        {/* Выход из аккаунта - под аватаром */}
        <div className="menu-item logout-section" onClick={handleLogout}>
          <div className="menu-icon logout-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="#6E6E6E"/>
            </svg>
          </div>
          <span className="menu-text">Выйти из аккаунта</span>
        </div>

        {/* Меню - абсолютное позиционирование по спецификации */}

        {/* Поиск */}
        <div
          className={`menu-item search-section ${activeMenuItem === 'search' ? 'active' : ''}`}
          onClick={() => navigate('/search')}
        >
          <div className="menu-icon search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="#6E6E6E"/>
            </svg>
          </div>
          <span className="menu-text">Поиск</span>
        </div>

        {/* Главная */}
        <div
          className={`menu-item home-section ${activeMenuItem === 'home' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <div className="menu-icon home-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="#000000"/>
            </svg>
          </div>
          <span className="menu-text">Главная</span>
        </div>

        {/* Проекты с dropdown */}
        <div
          className={`menu-item projects-section ${projectsExpanded ? 'expanded' : ''} ${activeMenuItem === 'projects' ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
        >
          <div className="menu-icon folder-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="#6E6E6E"/>
            </svg>
          </div>
          <Link
            to="/dashboard"
            className="menu-text projects-link"
            onClick={(e) => e.preventDefault()}
          >Проекты</Link>
          <button
            className="dropdown-arrow"
            onClick={(e) => {
              e.stopPropagation();
              toggleProjectsDropdown();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" style={{transform: projectsExpanded ? 'rotate(-90deg)' : 'rotate(0deg)'}}>
              <path d="M7 10l5 5 5-5z" fill="#6E6E6E"/>
            </svg>
          </button>

          {/* Выпадающий список проектов */}
          {projectsExpanded && (
            <div className="projects-dropdown">
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  className="project-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setProjectsExpanded(false);
                    navigate(`/project/${project.id}`);
                  }}
                >
                  <div className="project-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" fill="#6E6E6E"/>
                      </svg>
                  </div>
                  <span className="project-text" title={project.fullName}>
                    2026-P{String(index + 1).padStart(2, '0')}. {project.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Пользователи */}
        <div className="menu-item users-section">
          <div className="menu-icon person-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#6E6E6E"/>
            </svg>
          </div>
          <span className="menu-text">Пользователи</span>
        </div>

        {/* Журнал изменений */}
        <div
          className={`menu-item changelog-section ${activeMenuItem === 'changelog' ? 'active' : ''}`}
          onClick={() => navigate('/changelog')}
        >
          <div className="menu-icon history-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 18.99 10.51 19 13 19c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" fill="#6E6E6E"/>
            </svg>
          </div>
          <Link
            to="/changelog"
            className="menu-text"
            onClick={(e) => e.preventDefault()}
          >Журнал изменений</Link>
        </div>

        {/* Настройки */}
        <div className="menu-item settings-section">
          <div className="menu-icon settings-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" fill="#6E6E6E"/>
            </svg>
          </div>
          <span className="menu-text">Настройки</span>
        </div>

        {/* Уведомления */}
        <div className={`menu-item notifications-section ${projectsExpanded ? 'expanded' : ''}`}>
          <div className="menu-icon notifications-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="#6E6E6E"/>
            </svg>
          </div>
          <span className="menu-text">Уведомления</span>
        </div>

        {/* Мессенджер */}
        <div className={`menu-item messenger-section ${projectsExpanded ? 'expanded' : ''}`}>
          <div className="menu-icon mail-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#6E6E6E"/>
            </svg>
          </div>
          <span className="menu-text">Мессенджер</span>
        </div>

        {/* Документы */}
        <div className={`menu-item documents-section ${projectsExpanded ? 'expanded' : ''}`}>
          <div className="menu-icon file-copy-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="#6E6E6E"/>
            </svg>
          </div>
          <span className="menu-text">Документы</span>
        </div>

        {/* Нормативы */}
        <div className={`menu-item standards-section ${projectsExpanded ? 'expanded' : ''}`}>
          <div className="menu-icon book-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" fill="#6E6E6E"/>
            </svg>
          </div>
          <span className="menu-text">Нормативы</span>
        </div>

        {/* Logo - clickable link to home page */}
        <img
          src={isSidebarCollapsed ? logoCutImage : logoImage}
          alt="Medical Risk Analysis - Go to Home"
          className="sidebar-logo"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        />

      </div>

      {/* Main Content */}
      <div className="main-content">
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
