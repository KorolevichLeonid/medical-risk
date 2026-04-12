import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { ChevronLeft, ChevronRight, ChevronDown, FileText } from 'lucide-react';

const SearchIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.0833 15L8.60417 9.52083C8.1875 9.88194 7.70139 10.1632 7.14583 10.3646C6.59028 10.566 6 10.6667 5.375 10.6667C3.875 10.6667 2.60417 10.1458 1.5625 9.10417C0.520833 8.0625 0 6.80556 0 5.33333C0 3.86111 0.520833 2.60417 1.5625 1.5625C2.60417 0.520833 3.86806 0 5.35417 0C6.82639 0 8.07986 0.520833 9.11458 1.5625C10.1493 2.60417 10.6667 3.86111 10.6667 5.33333C10.6667 5.93056 10.5694 6.50694 10.375 7.0625C10.1806 7.61806 9.88889 8.13889 9.5 8.625L15 14.0833L14.0833 15ZM5.35417 9.41667C6.47917 9.41667 7.4375 9.01736 8.22917 8.21875C9.02083 7.42014 9.41667 6.45833 9.41667 5.33333C9.41667 4.20833 9.02083 3.24653 8.22917 2.44792C7.4375 1.64931 6.47917 1.25 5.35417 1.25C4.21528 1.25 3.24653 1.64931 2.44792 2.44792C1.64931 3.24653 1.25 4.20833 1.25 5.33333C1.25 6.45833 1.64931 7.42014 2.44792 8.21875C3.24653 9.01736 4.21528 9.41667 5.35417 9.41667Z" fill="#6E6E6E"/>
  </svg>
);

const HomeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.25 13.75H4.375V8.54167H8.95833V13.75H12.0833V5.625L6.66667 1.5625L1.25 5.625V13.75ZM0 15V5L6.66667 0L13.3333 5V15H7.70833V9.79167H5.625V15H0Z" fill="#6E6E6E"/>
  </svg>
);

const FolderIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 17 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.25 13.3333C0.916667 13.3333 0.625 13.2049 0.375 12.9479C0.125 12.691 0 12.4028 0 12.0833V1.25C0 0.930556 0.125 0.642361 0.375 0.385417C0.625 0.128472 0.916667 0 1.25 0H7.10417L8.35417 1.25H15.4167C15.7361 1.25 16.0243 1.37847 16.2812 1.63542C16.5382 1.89236 16.6667 2.18056 16.6667 2.5V12.0833C16.6667 12.4028 16.5382 12.691 16.2812 12.9479C16.0243 13.2049 15.7361 13.3333 15.4167 13.3333H1.25ZM1.25 12.0833H15.4167V2.5H7.83333L6.58333 1.25H1.25V12.0833Z" fill="#6E6E6E"/>
  </svg>
);

const MailIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 17 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.25 13.3333C0.916667 13.3333 0.625 13.2083 0.375 12.9583C0.125 12.7083 0 12.4167 0 12.0833V1.25C0 0.916667 0.125 0.625 0.375 0.375C0.625 0.125 0.916667 0 1.25 0H15.4167C15.75 0 16.0417 0.125 16.2917 0.375C16.5417 0.625 16.6667 0.916667 16.6667 1.25V12.0833C16.6667 12.4167 16.5417 12.7083 16.2917 12.9583C16.0417 13.2083 15.75 13.3333 15.4167 13.3333H1.25ZM8.33333 7.04167L1.25 2.39583V12.0833H15.4167V2.39583L8.33333 7.04167ZM8.33333 5.79167L15.3333 1.25H1.35417L8.33333 5.79167ZM1.25 2.39583V1.25V12.0833V2.39583Z" fill="#6E6E6E"/>
  </svg>
);

const BellIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 14 17" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 14.1667V12.9167H1.66667V6.58333C1.66667 5.41667 2.01042 4.37153 2.69792 3.44792C3.38542 2.52431 4.29167 1.94444 5.41667 1.70833V1.25C5.41667 0.902778 5.53819 0.607639 5.78125 0.364583C6.02431 0.121528 6.31944 0 6.66667 0C7.01389 0 7.30903 0.121528 7.55208 0.364583C7.79514 0.607639 7.91667 0.902778 7.91667 1.25V1.70833C9.04167 1.94444 9.94792 2.52431 10.6354 3.44792C11.3229 4.37153 11.6667 5.41667 11.6667 6.58333V12.9167H13.3333V14.1667H0ZM6.66667 16.6667C6.20833 16.6667 5.81597 16.5035 5.48958 16.1771C5.16319 15.8507 5 15.4583 5 15H8.33333C8.33333 15.4583 8.17014 15.8507 7.84375 16.1771C7.51736 16.5035 7.125 16.6667 6.66667 16.6667ZM2.91667 12.9167H10.4167V6.58333C10.4167 5.54167 10.0521 4.65625 9.32292 3.92708C8.59375 3.19792 7.70833 2.83333 6.66667 2.83333C5.625 2.83333 4.73958 3.19792 4.01042 3.92708C3.28125 4.65625 2.91667 5.54167 2.91667 6.58333V12.9167Z" fill="#6E6E6E"/>
  </svg>
);

const FileTextIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 19" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.5833 15.8333H3.75C3.41667 15.8333 3.125 15.7083 2.875 15.4583C2.625 15.2083 2.5 14.9167 2.5 14.5833V1.25C2.5 0.916667 2.625 0.625 2.875 0.375C3.125 0.125 3.41667 0 3.75 0H11L15.8333 4.83333V14.5833C15.8333 14.9167 15.7083 15.2083 15.4583 15.4583C15.2083 15.7083 14.9167 15.8333 14.5833 15.8333ZM10.375 5.375V1.25H3.75V14.5833H14.5833V5.375H10.375ZM1.25 18.3333C0.916667 18.3333 0.625 18.2083 0.375 17.9583C0.125 17.7083 0 17.4167 0 17.0833V4.1875H1.25V17.0833H11.625V18.3333H1.25Z" fill="#6E6E6E"/>
  </svg>
);

const BookIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 14 17" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.25 16.6667C0.916667 16.6667 0.625 16.5417 0.375 16.2917C0.125 16.0417 0 15.75 0 15.4167V1.25C0 0.916667 0.125 0.625 0.375 0.375C0.625 0.125 0.916667 0 1.25 0H12.0833C12.4167 0 12.7083 0.125 12.9583 0.375C13.2083 0.625 13.3333 0.916667 13.3333 1.25V15.4167C13.3333 15.75 13.2083 16.0417 12.9583 16.2917C12.7083 16.5417 12.4167 16.6667 12.0833 16.6667H1.25ZM1.25 15.4167H12.0833V1.25H10.8333V6.79167L8.8125 5.625L6.79167 6.79167V1.25H1.25V15.4167Z" fill="#6E6E6E"/>
  </svg>
);

const UserIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.41667 5.375C3.83333 4.79167 3.54167 4.04167 3.54167 3.125C3.54167 2.20833 3.83333 1.45833 4.41667 0.875C5 0.291667 5.75 0 6.66667 0C7.58333 0 8.33333 0.291667 8.91667 0.875C9.5 1.45833 9.79167 2.20833 9.79167 3.125C9.79167 4.04167 9.5 4.79167 8.91667 5.375C8.33333 5.95833 7.58333 6.25 6.66667 6.25C5.75 6.25 5 5.95833 4.41667 5.375ZM0 12.9375V10.9792C0 10.4514 0.131944 10 0.395833 9.625C0.659722 9.25 1 8.96528 1.41667 8.77083C2.34722 8.35417 3.23958 8.04167 4.09375 7.83333C4.94792 7.625 5.80556 7.52083 6.66667 7.52083C7.52778 7.52083 8.38194 7.62847 9.22917 7.84375C10.0764 8.05903 10.9653 8.36806 11.8958 8.77083C12.3264 8.96528 12.6736 9.25 12.9375 9.625C13.2014 10 13.3333 10.4514 13.3333 10.9792V12.9375H0ZM1.25 11.6875H12.0833V10.9792C12.0833 10.7569 12.0174 10.5451 11.8854 10.3438C11.7535 10.1424 11.5903 9.99306 11.3958 9.89583C10.5069 9.46528 9.69444 9.17014 8.95833 9.01042C8.22222 8.85069 7.45833 8.77083 6.66667 8.77083C5.875 8.77083 5.10417 8.85069 4.35417 9.01042C3.60417 9.17014 2.79167 9.46528 1.91667 9.89583C1.72222 9.99306 1.5625 10.1424 1.4375 10.3438C1.3125 10.5451 1.25 10.7569 1.25 10.9792V11.6875ZM8.01042 4.46875C8.36458 4.11458 8.54167 3.66667 8.54167 3.125C8.54167 2.58333 8.36458 2.13542 8.01042 1.78125C7.65625 1.42708 7.20833 1.25 6.66667 1.25C6.125 1.25 5.67708 1.42708 5.32292 1.78125C4.96875 2.13542 4.79167 2.58333 4.79167 3.125C4.79167 3.66667 4.96875 4.11458 5.32292 4.46875C5.67708 4.82292 6.125 5 6.66667 5C7.20833 5 7.65625 4.82292 8.01042 4.46875Z" fill="#6E6E6E"/>
  </svg>
);

const HistoryIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.4375 15C5.36806 15 3.61111 14.2674 2.16667 12.8021C0.722222 11.3368 0 9.5625 0 7.47917H1.25C1.25 9.21528 1.84722 10.6944 3.04167 11.9167C4.23611 13.1389 5.70139 13.75 7.4375 13.75C9.20139 13.75 10.6944 13.1319 11.9167 11.8958C13.1389 10.6597 13.75 9.15972 13.75 7.39583C13.75 5.67361 13.1319 4.21875 11.8958 3.03125C10.6597 1.84375 9.17361 1.25 7.4375 1.25C6.49306 1.25 5.60764 1.46528 4.78125 1.89583C3.95486 2.32639 3.23611 2.89583 2.625 3.60417H4.8125V4.85417H0.458333V0.520833H1.70833V2.72917C2.43056 1.88194 3.28819 1.21528 4.28125 0.729167C5.27431 0.243056 6.32639 0 7.4375 0C8.47917 0 9.45833 0.194444 10.375 0.583333C11.2917 0.972222 12.0938 1.50347 12.7812 2.17708C13.4688 2.85069 14.0104 3.63889 14.4062 4.54167C14.8021 5.44444 15 6.41667 15 7.45833C15 8.5 14.8021 9.47917 14.4062 10.3958C14.0104 11.3125 13.4688 12.1111 12.7812 12.7917C12.0938 13.4722 11.2917 14.0104 10.375 14.4062C9.45833 14.8021 8.47917 15 7.4375 15ZM10.1042 10.8958L6.89583 7.72917V3.27083H8.14583V7.20833L11 10L10.1042 10.8958Z" fill="#6E6E6E"/>
  </svg>
);

const SettingsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.41667 16.6667L6 14.0417C5.73611 13.9444 5.45833 13.8125 5.16667 13.6458C4.875 13.4792 4.61806 13.3056 4.39583 13.125L1.9375 14.25L0 10.8333L2.25 9.1875C2.22222 9.0625 2.20486 8.92014 2.19792 8.76042C2.19097 8.60069 2.1875 8.45833 2.1875 8.33333C2.1875 8.20833 2.19097 8.06597 2.19792 7.90625C2.20486 7.74653 2.22222 7.60417 2.25 7.47917L0 5.83333L1.9375 2.41667L4.39583 3.54167C4.61806 3.36111 4.875 3.1875 5.16667 3.02083C5.45833 2.85417 5.73611 2.72917 6 2.64583L6.41667 0H10.25L10.6667 2.625C10.9306 2.72222 11.2118 2.85069 11.5104 3.01042C11.809 3.17014 12.0625 3.34722 12.2708 3.54167L14.7292 2.41667L16.6667 5.83333L14.4167 7.4375C14.4444 7.57639 14.4618 7.72569 14.4687 7.88542C14.4757 8.04514 14.4792 8.19444 14.4792 8.33333C14.4792 8.47222 14.4757 8.61806 14.4687 8.77083C14.4618 8.92361 14.4444 9.06944 14.4167 9.20833L16.6667 10.8333L14.7292 14.25L12.2708 13.125C12.0486 13.3056 11.7951 13.4826 11.5104 13.6562C11.2257 13.8299 10.9444 13.9583 10.6667 14.0417L10.25 16.6667H6.41667ZM7.41667 15.4167H9.25L9.54167 13.0833C10 12.9722 10.434 12.7986 10.8437 12.5625C11.2535 12.3264 11.625 12.0417 11.9583 11.7083L14.1667 12.6667L15 11.1667L13.0417 9.72917C13.0972 9.49306 13.1424 9.26042 13.1771 9.03125C13.2118 8.80208 13.2292 8.56944 13.2292 8.33333C13.2292 8.09722 13.2153 7.86458 13.1875 7.63542C13.1597 7.40625 13.1111 7.17361 13.0417 6.9375L15 5.5L14.1667 4L11.9583 4.95833C11.6389 4.59722 11.2778 4.29514 10.875 4.05208C10.4722 3.80903 10.0278 3.65278 9.54167 3.58333L9.25 1.25H7.41667L7.125 3.58333C6.65278 3.68056 6.21181 3.84722 5.80208 4.08333C5.39236 4.31944 5.02778 4.61111 4.70833 4.95833L2.5 4L1.66667 5.5L3.625 6.9375C3.56944 7.17361 3.52431 7.40625 3.48958 7.63542C3.45486 7.86458 3.4375 8.09722 3.4375 8.33333C3.4375 8.56944 3.45486 8.80208 3.48958 9.03125C3.52431 9.26042 3.56944 9.49306 3.625 9.72917L1.66667 11.1667L2.5 12.6667L4.70833 11.7083C5.04167 12.0417 5.41319 12.3264 5.82292 12.5625C6.23264 12.7986 6.66667 12.9722 7.125 13.0833L7.41667 15.4167ZM8.33333 11.0417C9.08333 11.0417 9.72222 10.7778 10.25 10.25C10.7778 9.72222 11.0417 9.08333 11.0417 8.33333C11.0417 7.58333 10.7778 6.94444 10.25 6.41667C9.72222 5.88889 9.08333 5.625 8.33333 5.625C7.58333 5.625 6.94444 5.88889 6.41667 6.41667C5.88889 6.94444 5.625 7.58333 5.625 8.33333C5.625 9.08333 5.88889 9.72222 6.41667 10.25C6.94444 10.7778 7.58333 11.0417 8.33333 11.0417Z" fill="#6E6E6E"/>
  </svg>
);
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
    { icon: SearchIcon, label: 'Поиск', id: 'search', onClick: () => navigate('/search') },
    { icon: HomeIcon, label: 'Главная', id: 'home', onClick: () => navigate('/') },
    { icon: FolderIcon, label: 'Проекты', id: 'projects', hasDropdown: true, onClick: () => navigate('/dashboard') },
    { icon: MailIcon, label: 'Мессенджер', id: 'messenger' },
    { icon: BellIcon, label: 'Уведомления', id: 'notifications' },
    { icon: FileTextIcon, label: 'Документы', id: 'documents' },
    { icon: BookIcon, label: 'Нормативы', id: 'standards' },
  ];

  const bottomMenuItems = [
    { icon: UserIcon, label: 'Пользователи', onClick: () => {} },
    { icon: HistoryIcon, label: 'Журнал изменений', id: 'changelog', onClick: () => navigate('/changelog') },
    { icon: SettingsIcon, label: 'Настройки', onClick: () => {} },
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
          className="absolute bottom-[26px] -right-[14px] z-30 w-7 h-7 rounded-full bg-[#F0EECE] border border-gray-300 shadow-md flex items-center justify-center text-[#6E6E6E] hover:text-black transition-colors focus:outline-none"
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Content */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden${!isSidebarOpen ? ' sidebar-collapsed' : ''}`}>
        <div className="p-6 lg:p-12">
          {children}
        </div>
      </div>

      <SupportButton />
    </div>
  );
};

export default Layout;
