import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import {
  Search, Home, Folder, Mail, Bell, FileText, Book,
  User, History, Settings, ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import SupportButton from './SupportButton';
import API_BASE_URL from '../config';
import './Layout.css';
import logomaxImg from '../assets/logomax.svg';
import logominImg from '../assets/logomin.svg';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { instance } = useMsal();
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectsExpanded, setProjectsExpanded] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser({
        name: `${parsedUser.first_name} ${parsedUser.last_name}`,
        role: parsedUser.role,
        email: parsedUser.email,
        avatar: parsedUser.avatar_url || null
      });
    }
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const projectsData = await response.json();
        setProjects(projectsData.map(p => ({
          id: p.id,
          name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
          fullName: p.name
        })));
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    try {
      instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin + '/' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setTimeout(() => navigate('/'), 100);
  };

  const getActiveMenuItem = () => {
    const path = location.pathname;
    if (path === '/' || path === '/home') return 'home';
    if (path === '/search') return 'search';
    if (path === '/dashboard' || path.startsWith('/project/')) return 'projects';
    if (path === '/changelog') return 'changelog';
    if (path === '/account') return 'account';
    return null;
  };

  const activeMenuItem = getActiveMenuItem();

  const menuItems = [
    { icon: Search, label: 'Поиск', id: 'search', onClick: () => navigate('/search') },
    { icon: Home, label: 'Главная', id: 'home', onClick: () => navigate('/') },
    { icon: Folder, label: 'Проекты', id: 'projects', hasDropdown: true, onClick: () => navigate('/dashboard') },
    { icon: Mail, label: 'Мессенджер', id: 'messenger' },
    { icon: Bell, label: 'Уведомления', id: 'notifications' },
    { icon: FileText, label: 'Документы', id: 'documents' },
    { icon: Book, label: 'Нормативы', id: 'standards' },
  ];

  const bottomMenuItems = [
    { icon: User, label: 'Пользователи', onClick: () => {} },
    { icon: History, label: 'Журнал изменений', id: 'changelog', onClick: () => navigate('/changelog') },
    { icon: Settings, label: 'Настройки', onClick: () => {} },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-[#F0FBFF] to-[#EAEAEA] font-sans text-black">
      {/* Sidebar */}
      <div
        className={`relative flex flex-col bg-[#F0EECE] shadow-[5px_0px_10px_rgba(0,0,0,0.25)] transition-all duration-300 z-20 ${
          isSidebarOpen ? 'w-[354px]' : 'w-[108px]'
        }`}
      >
        {/* Profile in Sidebar */}
        <div
          className="flex items-center px-[24px] pt-[15px] pb-[11px] h-[70px] whitespace-nowrap overflow-hidden cursor-pointer hover:bg-[#e6e4c5] rounded-lg transition-colors"
          onClick={() => navigate('/account')}
        >
          <div className="relative shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-[50px] h-[50px] rounded-full border-2 border-white object-cover" />
            ) : (
              <div className="w-[50px] h-[50px] rounded-full border-2 border-white bg-[#8b9dc3] flex items-center justify-center text-white font-semibold text-lg">
                {getInitials(user?.name)}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#9ACD32] border-2 border-white rounded-full"></div>
          </div>
          <div className={`ml-4 flex flex-col transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
            <span className="font-bold text-lg font-raleway">{user?.name || 'Пользователь'}</span>
            <span className="text-sm text-black font-raleway">{user?.role || ''}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-4 space-y-[5px]">
          {menuItems.map((item, index) => (
            <div key={index} className="relative">
              <div
                onClick={() => {
                  if (item.id === 'projects' && item.hasDropdown) {
                    navigate('/dashboard');
                  } else if (item.onClick) {
                    item.onClick();
                  }
                }}
                className={`flex items-center cursor-pointer hover:bg-[#e6e4c5] h-[30px] rounded-lg transition-colors group whitespace-nowrap ${isSidebarOpen ? 'px-4 mx-4' : 'justify-center mx-2'} ${activeMenuItem === item.id ? 'bg-[#e6e4c5]' : ''}`}
              >
                <item.icon className="w-6 h-6 text-[#6E6E6E] shrink-0" />
                <div className={`flex items-center justify-between transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'ml-4 opacity-100 flex-1' : 'opacity-0 w-0'}`}>
                  <span className={`text-lg font-raleway ${activeMenuItem === item.id ? 'font-bold' : ''}`}>{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.hasDropdown && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectsExpanded(!projectsExpanded);
                        }}
                      >
                        <ChevronDown className={`w-4 h-4 text-[#6E6E6E] transition-transform ${projectsExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Projects dropdown */}
              {item.id === 'projects' && projectsExpanded && isSidebarOpen && (
                <div className="ml-9 mt-2 space-y-1 max-h-[150px] overflow-y-auto">
                  {projects.map((project, idx) => (
                    <div
                      key={project.id}
                      className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#e6e4c5] rounded-lg text-sm font-raleway"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectsExpanded(false);
                        navigate(`/project/${project.id}`);
                      }}
                      title={project.fullName}
                    >
                      <FileText className="w-4 h-4 text-[#6E6E6E] shrink-0" />
                      <span className="truncate">2026-P{String(idx + 1).padStart(2, '0')}. {project.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="pb-[8px] space-y-[5px] mb-[80px]">
          {bottomMenuItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center cursor-pointer hover:bg-[#e6e4c5] h-[30px] rounded-lg transition-colors whitespace-nowrap ${isSidebarOpen ? 'px-4 mx-4' : 'justify-center mx-2'} ${activeMenuItem === item.id ? 'bg-[#e6e4c5]' : ''}`}
              onClick={item.onClick}
            >
              <item.icon className="w-6 h-6 text-[#6E6E6E] shrink-0" />
              <div className={`transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'ml-4 opacity-100 flex-1' : 'opacity-0 w-0'}`}>
                <span className={`text-lg font-raleway ${activeMenuItem === item.id ? 'font-bold' : ''}`}>{item.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Logo */}
        <div className="absolute bottom-[20px] left-0 w-full h-[44px] flex items-center justify-center">
          {/* Expanded: full logo — centered */}
          <div className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible absolute'}`}>
            <img src={logomaxImg} alt="SCICYBER LAB" className="h-[26px] w-auto" />
          </div>

          {/* Collapsed: mini logo — centered */}
          <div className={`transition-all duration-300 ${!isSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible absolute'}`}>
            <img src={logominImg} alt="SLAB" className="h-[30px] w-auto" />
          </div>
        </div>

        {/* Toggle button — on the right edge of sidebar, always visible */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute bottom-[26px] -right-[14px] z-30 w-7 h-7 rounded-full bg-[#F0EECE] border border-gray-300 shadow-md flex items-center justify-center text-[#6E6E6E] hover:text-black transition-colors"
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 lg:p-12">
          {children}
        </div>
      </div>

      <SupportButton />
    </div>
  );
};

export default Layout;
