import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Users, ChevronDown, ChevronUp } from 'lucide-react';

const PencilIcon = () => (
  <svg width="13.54" height="13.52" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.25 13.7292H2.16667L12 3.91667L11.0833 3L1.25 12.8125V13.7292ZM0 14.9792V12.3125L11.9792 0.354167C12.0903 0.243056 12.2222 0.15625 12.375 0.09375C12.5278 0.03125 12.6875 0 12.8542 0C13.0069 0 13.1597 0.03125 13.3125 0.09375C13.4653 0.15625 13.6042 0.243056 13.7292 0.354167L14.6458 1.27083C14.7708 1.39583 14.8611 1.53472 14.9167 1.6875C14.9722 1.84028 15 1.99306 15 2.14583C15 2.29861 14.9688 2.45486 14.9062 2.61458C14.8438 2.77431 14.7569 2.90972 14.6458 3.02083L2.66667 14.9792H0ZM11.5417 3.45833L11.0833 3L12 3.91667L11.5417 3.45833Z" fill="#6E6E6E"/>
  </svg>
);

const WarningIcon = () => (
  <svg width="16.55" height="14.29" viewBox="0 0 19 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 15.8333L9.16667 0L18.3333 15.8333H0ZM2.16667 14.5833H16.1667L9.16667 2.5L2.16667 14.5833ZM9.69792 13.215C9.81597 13.0946 9.875 12.9453 9.875 12.7671C9.875 12.589 9.81472 12.441 9.69417 12.3229C9.57375 12.2049 9.42445 12.1458 9.24625 12.1458C9.06819 12.1458 8.92014 12.2061 8.80208 12.3267C8.68403 12.4471 8.625 12.5964 8.625 12.7746C8.625 12.9526 8.68528 13.1007 8.80583 13.2187C8.92625 13.3368 9.07556 13.3958 9.25375 13.3958C9.43181 13.3958 9.57986 13.3356 9.69792 13.215ZM8.625 11.0833H9.875V6.41667H8.625V11.0833Z" fill="#6E6E6E"/>
  </svg>
);

const ThreeDotsIcon = () => (
  <svg width="2" height="13.33" viewBox="0 0 3 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.10463 14.7715C0.799046 14.7715 0.538544 14.6627 0.323127 14.4451C0.107709 14.2276 0 13.966 0 13.6604C0 13.3548 0.108786 13.0943 0.326358 12.8789C0.54393 12.6635 0.805509 12.5558 1.11109 12.5558C1.41668 12.5558 1.67718 12.6646 1.8926 12.8821C2.10802 13.0997 2.21573 13.3613 2.21573 13.6669C2.21573 13.9725 2.10694 14.233 1.88937 14.4484C1.6718 14.6638 1.41022 14.7715 1.10463 14.7715ZM1.10463 8.49362C0.799046 8.49362 0.538544 8.38483 0.323127 8.16726C0.107709 7.94969 0 7.68811 0 7.38252C0 7.07694 0.108786 6.81643 0.326358 6.60102C0.54393 6.3856 0.805509 6.27789 1.11109 6.27789C1.41668 6.27789 1.67718 6.38668 1.8926 6.60425C2.10802 6.82182 2.21573 7.0834 2.21573 7.38898C2.21573 7.69457 2.10694 7.95507 1.88937 8.17049C1.6718 8.38591 1.41022 8.49362 1.10463 8.49362ZM1.10463 2.21573C0.799046 2.21573 0.538544 2.10694 0.323127 1.88937C0.107709 1.6718 0 1.41022 0 1.10463C0 0.799046 0.108786 0.538544 0.326358 0.323127C0.54393 0.107709 0.805509 0 1.11109 0C1.41668 0 1.67718 0.108786 1.8926 0.326358C2.10802 0.54393 2.21573 0.805509 2.21573 1.11109C2.21573 1.41668 2.10694 1.67718 1.88937 1.8926C1.6718 2.10802 1.41022 2.21573 1.10463 2.21573Z" fill="#6E6E6E"/>
  </svg>
);

const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 6.875V0H6.875V6.875H0ZM0 15V8.125H6.875V15H0ZM8.125 6.875V0H15V6.875H8.125ZM8.125 15V8.125H15V15H8.125ZM1.25 5.625H5.625V1.25H1.25V5.625ZM9.375 5.625H13.75V1.25H9.375V5.625ZM9.375 13.75H13.75V9.375H9.375V13.75ZM1.25 13.75H5.625V9.375H1.25V13.75Z" fill="currentColor"/>
  </svg>
);

const ListIcon = () => (
  <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 7.83333V6.58333H13.3333V7.83333H0ZM0 11.1667V9.91667H13.3333V11.1667H0ZM0 4.58333V3.33333H13.3333V4.58333H0ZM0 1.25V0H13.3333V1.25H0Z" fill="currentColor"/>
  </svg>
);

const EmptyStateIcon = () => (
  <svg width="55" height="55" viewBox="0 0 55 55" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_2328_502)">
      <path d="M6.01562 0H48.9844C52.305 0 55 2.695 55 6.01562V48.9844C55 50.5798 54.3662 52.1099 53.2381 53.2381C52.1099 54.3662 50.5798 55 48.9844 55H6.01562C4.42018 55 2.89008 54.3662 1.76194 53.2381C0.633787 52.1099 0 50.5798 0 48.9844L0 6.01562C0 2.695 2.695 0 6.01562 0ZM5.15625 6.01562V48.9844C5.15625 49.4588 5.54125 49.8438 6.01562 49.8438H48.9844C49.2123 49.8438 49.4309 49.7532 49.592 49.592C49.7532 49.4309 49.8438 49.2123 49.8438 48.9844V6.01562C49.8438 5.7877 49.7532 5.56912 49.592 5.40796C49.4309 5.24679 49.2123 5.15625 48.9844 5.15625H6.01562C5.7877 5.15625 5.56912 5.24679 5.40796 5.40796C5.24679 5.56912 5.15625 5.7877 5.15625 6.01562ZM40.3906 10.3125C41.0744 10.3125 41.7301 10.5841 42.2136 11.0676C42.6971 11.5511 42.9688 12.2069 42.9688 12.8906V38.6719C42.9688 39.3556 42.6971 40.0114 42.2136 40.4949C41.7301 40.9784 41.0744 41.25 40.3906 41.25C39.7069 41.25 39.0511 40.9784 38.5676 40.4949C38.0841 40.0114 37.8125 39.3556 37.8125 38.6719V12.8906C37.8125 12.2069 38.0841 11.5511 38.5676 11.0676C39.0511 10.5841 39.7069 10.3125 40.3906 10.3125ZM12.0312 12.8906C12.0312 12.2069 12.3029 11.5511 12.7864 11.0676C13.2699 10.5841 13.9256 10.3125 14.6094 10.3125C15.2931 10.3125 15.9489 10.5841 16.4324 11.0676C16.9159 11.5511 17.1875 12.2069 17.1875 12.8906V31.7969C17.1875 32.4806 16.9159 33.1364 16.4324 33.6199C15.9489 34.1034 15.2931 34.375 14.6094 34.375C13.9256 34.375 13.2699 34.1034 12.7864 33.6199C12.3029 33.1364 12.0312 32.4806 12.0312 31.7969V12.8906ZM27.5 10.3125C28.1838 10.3125 28.8395 10.5841 29.323 11.0676C29.8065 11.5511 30.0781 12.2069 30.0781 12.8906V24.9219C30.0781 25.6056 29.8065 26.2614 29.323 26.7449C28.8395 27.2284 28.1838 27.5 27.5 27.5C26.8162 27.5 26.1605 27.2284 25.677 26.7449C25.1935 26.2614 24.9219 25.6056 24.9219 24.9219V12.8906C24.9219 12.2069 25.1935 11.5511 25.677 11.0676C26.1605 10.5841 26.8162 10.3125 27.5 10.3125Z" fill="#11C1DD"/>
    </g>
    <defs>
      <clipPath id="clip0_2328_502">
        <rect width="55" height="55" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);
import API_BASE_URL from '../config';
import './Dashboard.css';

/* ===================== Constants ===================== */

const STATUS_COLORS = {
  draft: { label: 'Черновик', color: '#E0E0E0' },
  in_progress: { label: 'В процессе', color: '#10A6DD' },
  review: { label: 'На проверке', color: '#FFB020' },
  completed: { label: 'Завершено', color: '#27C276' }
};

const ROLE_LABELS = {
  admin: 'Администратор',
  manager: 'Продукт-менеджер',
  risk_assessment_team_leader: 'Руководитель команды по рискам',
  doctor: 'Доктор',
  specialist: 'Специалист по ЖЦ'
};

const getProgressColor = (progress) => {
  if (progress >= 90) return '#43A047';
  if (progress >= 60) return '#1976D2';
  if (progress >= 30) return '#FB8C00';
  return '#EF4444';
};

const SORT_OPTIONS = [
  { value: 'date', label: 'По дате создания' },
  { value: 'alpha', label: 'По алфавиту' },
  { value: 'activity', label: 'По последней активности' }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все проекты' },
  { value: 'draft', label: 'Черновик' },
  { value: 'in_progress', label: 'В процессе' },
  { value: 'review', label: 'На проверке' },
  { value: 'completed', label: 'Завершено' }
];

const ROLE_OPTIONS = [
  { value: 'all', label: 'Все роли' },
  { value: 'admin', label: 'Администратор' },
  { value: 'manager', label: 'Продукт-менеджер' },
  { value: 'risk_assessment_team_leader', label: 'Руководитель команды по рискам' },
  { value: 'doctor', label: 'Доктор' },
  { value: 'specialist', label: 'Специалист по ЖЦ' }
];

/* ===================== Sub-Components ===================== */

const CustomDropdown = ({ label, options, value, isOpen, onToggle, onClose, onSelect }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (isOpen) onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const currentLabel = options.find(o => o.value === value)?.label || label;

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <button className="custom-dropdown-btn" onClick={onToggle} type="button">
        <span>{currentLabel}</span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {isOpen && (
        <div className="custom-dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              className={`custom-dropdown-option ${value === option.value ? 'active' : ''}`}
              onClick={() => {
                onSelect(option.value);
                onClose();
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectActionsMenu = ({ project, isOpen, onToggle, canEdit, canDelete, onEdit, onRisks, onDelete }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        if (isOpen) onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div className="project-actions-menu" ref={menuRef}>
      <button
        className="project-actions-menu-btn"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        type="button"
      >
        <ThreeDotsIcon />
      </button>
      {isOpen && (
        <div className="project-actions-menu-dropdown">
          {canEdit && (
            <button
              className="project-actions-menu-item"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              type="button"
            >
              Редактировать
            </button>
          )}
          <button
            className="project-actions-menu-item"
            onClick={(e) => { e.stopPropagation(); onRisks(); }}
            type="button"
          >
            Риски
          </button>
          {canDelete && (
            <button
              className="project-actions-menu-item danger"
              onClick={(e) => { e.stopPropagation(); onDelete(e); }}
              type="button"
            >
              Удалить проект
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* ===================== Main Component ===================== */

const Dashboard = () => {
  const navigate = useNavigate();

  // Existing state
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showReturn, setShowReturn] = useState(false);
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem('project_view_mode') || 'grid'
  );

  // New state
  const [sortOrder, setSortOrder] = useState('date');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [activeCardMenu, setActiveCardMenu] = useState(null);

  // ---- Existing logic (unchanged) ----

  useEffect(() => {
    loadProjects();
    loadCurrentUser();
    const onScroll = () => {
      const content = document.querySelector('.content-body');
      const scrollTop = content ? content.scrollTop : (window.pageYOffset || document.documentElement.scrollTop);
      setShowReturn(scrollTop > 100);
    };
    (window).addEventListener('scroll', onScroll);
    onScroll();
    return () => (window).removeEventListener('scroll', onScroll);
  }, []);

  const loadCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  };

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
        const formattedProjects = projectsData.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          progress: project.progress_percentage || 0,
          createdAt: project.created_at,
          lastUpdated: project.updated_at || project.created_at,
          notifications: 0,
          team: [],
          deviceType: project.device_name,
          userRole: project.user_role,
          userRoles: project.user_roles || [],
          ownerId: project.owner_id,
          memberCount: project.member_count
        }));
        setProjects(formattedProjects);
        setFilteredProjects(formattedProjects);
      } else {
        console.error('Failed to load projects:', response.status);
        setProjects([]);
        setFilteredProjects([]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
      setFilteredProjects([]);
    }
  };

  const canEditProject = (project) => {
    return project.userRole === 'manager' || project.userRole === 'admin';
  };

  const canDeleteProject = (project) => {
    return project.userRole === 'admin';
  };

  const handleProjectClick = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  const handleDeleteProject = async (projectId, projectName, e) => {
    e.stopPropagation();

    if (!window.confirm(`Вы уверены, что хотите удалить проект "${projectName}"?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const updatedProjects = projects.filter(p => p.id !== projectId);
        setProjects(updatedProjects);
        alert('Проект успешно удален');
      } else if (response.status === 403) {
        alert('У вас нет прав для удаления этого проекта');
      } else if (response.status === 404) {
        alert('Проект не найден');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Ошибка при удалении проекта: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Ошибка при удалении проекта. Проверьте подключение к серверу.');
    }
  };

  const scrollToTop = () => {
    const content = document.querySelector('.content-body');
    if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('project_view_mode', mode);
  };

  // ---- Filter & Sort logic ----

  useEffect(() => {
    let filtered = [...projects];

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.status === filterStatus);
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(project =>
        (project.userRoles && project.userRoles.includes(filterRole)) || project.userRole === filterRole
      );
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(project =>
        (project.name && project.name.toLowerCase().includes(term)) ||
        (project.description && project.description.toLowerCase().includes(term)) ||
        String(project.id).includes(term)
      );
    }

    // Sorting
    if (sortOrder === 'alpha') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
    } else if (sortOrder === 'activity') {
      filtered.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
    } else {
      // 'date' — by creation date descending
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    setFilteredProjects(filtered);
  }, [projects, filterStatus, filterRole, searchTerm, sortOrder]);

  // ---- Dropdown coordination ----

  const closeAllDropdowns = () => {
    setSortDropdownOpen(false);
    setStatusDropdownOpen(false);
    setRoleDropdownOpen(false);
  };

  // ---- Helpers ----

  const getRoleLabel = (project) => {
    const role = project.userRole;
    return ROLE_LABELS[role] || role || '—';
  };

  const getStatusInfo = (status) => {
    return STATUS_COLORS[status] || STATUS_COLORS.draft;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';

    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Только что';
    if (diffMin < 60) return `${diffMin} мин назад`;

    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Сегодня, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (isYesterday) {
      return `Вчера, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) + ' г.';
  };

  const getDisplayName = (project) => {
    if (project.name && project.name.trim()) return project.name;
    return 'Без названия';
  };

  const hasAnyProjects = projects.length > 0;

  // ---- Render ----

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Проекты</h1>
        {hasAnyProjects && (
          <Link to="/project/new" className="create-project-btn">
            Создать проект
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="search-wrapper" style={{ maxWidth: '380px' }}>
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Найти проект по названию или ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input-new"
        />
      </div>

      {/* Filters Row */}
      <div className="filters-row">
        <CustomDropdown
          label="Сортировка"
          options={SORT_OPTIONS}
          value={sortOrder}
          isOpen={sortDropdownOpen}
          onToggle={() => {
            const wasOpen = sortDropdownOpen;
            closeAllDropdowns();
            if (!wasOpen) setSortDropdownOpen(true);
          }}
          onClose={() => setSortDropdownOpen(false)}
          onSelect={(val) => setSortOrder(val)}
        />

        <CustomDropdown
          label="Статус"
          options={STATUS_OPTIONS}
          value={filterStatus}
          isOpen={statusDropdownOpen}
          onToggle={() => {
            const wasOpen = statusDropdownOpen;
            closeAllDropdowns();
            if (!wasOpen) setStatusDropdownOpen(true);
          }}
          onClose={() => setStatusDropdownOpen(false)}
          onSelect={(val) => setFilterStatus(val)}
        />

        {currentUser?.role === 'USER' && (
          <CustomDropdown
            label="Моя роль"
            options={ROLE_OPTIONS}
            value={filterRole}
            isOpen={roleDropdownOpen}
            onToggle={() => {
              const wasOpen = roleDropdownOpen;
              closeAllDropdowns();
              if (!wasOpen) setRoleDropdownOpen(true);
            }}
            onClose={() => setRoleDropdownOpen(false)}
            onSelect={(val) => setFilterRole(val)}
          />
        )}

        {/* View Toggle */}
        <div className="view-toggle-new">
          <button
            className={`view-toggle-btn-new ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('grid')}
            type="button"
          >
            <GridIcon />
            <span className="view-toggle-tooltip">Табличный вид</span>
          </button>
          <div className="view-toggle-divider" />
          <button
            className={`view-toggle-btn-new ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('list')}
            type="button"
          >
            <ListIcon />
            <span className="view-toggle-tooltip">Строчный вид</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {!hasAnyProjects ? (
        /* Empty State — no projects at all */
        <div className="empty-state-new">
          <div className="empty-state-icon">
            <EmptyStateIcon />
          </div>
          <h2>Здесь пока пусто</h2>
          <p>Нажмите на кнопку ниже,<br />чтобы добавить свой первый проект и начать работу</p>
          <Link to="/project/new" className="empty-state-create-btn">
            Создать проект
          </Link>
        </div>
      ) : filteredProjects.length === 0 ? (
        /* Filter returned no results */
        <div className="empty-state-new" style={{ padding: '40px 20px' }}>
          <h2>Проекты не найдены</h2>
          <p>Попробуйте изменить параметры поиска или фильтрации</p>
        </div>
      ) : viewMode === 'list' ? (
        /* =================== List View — Table =================== */
        <div className="table-wrapper">
          {/* Header — outside white container */}
          <div className="table-list table-list-header">
            <div className="table-header-row">
              <div className="table-th table-th-id">ID</div>
              <div className="table-th table-th-name">Название проекта</div>
              <div className="table-th table-th-status">Статус</div>
              <div className="table-th table-th-role">Моя роль</div>
              <div className="table-th table-th-participants">Участники</div>
              <div className="table-th table-th-progress">Прогресс</div>
              <div className="table-th table-th-activity">Последняя<br />активность</div>
              <div className="table-th table-th-actions"></div>
            </div>
          </div>
          {/* Data rows — inside white container */}
          <div className="table-container">
          <div className="table-list table-list-data">
            {filteredProjects.map(project => {
              const statusInfo = getStatusInfo(project.status);
              const participantsCount = (project.memberCount || 0) + 1;
              return (
                <div
                  key={project.id}
                  className="table-data-row"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <div className="table-td table-td-id">#{project.id}</div>
                  <div className="table-td table-td-name">{getDisplayName(project)}</div>
                  <div className="table-td table-td-status">
                    <span
                      className="table-cell-status-badge"
                      style={{ backgroundColor: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="table-td table-td-role">{getRoleLabel(project)}</div>
                  <div className="table-td table-td-participants">
                    <Users size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                    {participantsCount} чел.
                  </div>
                  <div className="table-td table-td-progress" style={{ color: getProgressColor(project.progress) }}>
                    {project.progress}%
                  </div>
                  <div className="table-td table-td-activity">{formatDate(project.lastUpdated)}</div>
                  <div className="table-td table-td-actions">
                    <div className="table-actions-three-dot">
                      <ProjectActionsMenu
                        project={project}
                        isOpen={activeCardMenu === project.id}
                        onToggle={() => setActiveCardMenu(activeCardMenu === project.id ? null : project.id)}
                        canEdit={canEditProject(project)}
                        canDelete={canDeleteProject(project)}
                        onEdit={() => navigate(`/project/${project.id}/edit`)}
                        onRisks={() => navigate(`/project/${project.id}/risks`)}
                        onDelete={(e) => handleDeleteProject(project.id, project.name, e)}
                      />
                    </div>
                    <div className="table-actions-icons-row">
                      {canEditProject(project) && (
                        <button
                          className="table-action-icon"
                          onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}/edit`); }}
                          title="Редактировать"
                          type="button"
                        >
                          <PencilIcon />
                        </button>
                      )}
                      <button
                        className="table-action-icon"
                        onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}/risks`); }}
                        title="Риски"
                        type="button"
                      >
                        <WarningIcon />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      ) : (
        /* =================== Grid View — Cards =================== */
        <div className="projects-grid-new">
          {filteredProjects.map(project => {
            const statusInfo = getStatusInfo(project.status);
            const progressColor = getProgressColor(project.progress);
            const participantsCount = (project.memberCount || 0) + 1;
            return (
              <div
                key={project.id}
                className="project-card-new"
                onClick={() => handleProjectClick(project.id)}
              >
                {/* Top Row: ID + Menu */}
                <div className="card-top-row">
                  <span className="card-project-id">#{project.id}</span>
                  <ProjectActionsMenu
                    project={project}
                    isOpen={activeCardMenu === project.id}
                    onToggle={() => setActiveCardMenu(activeCardMenu === project.id ? null : project.id)}
                    canEdit={canEditProject(project)}
                    canDelete={canDeleteProject(project)}
                    onEdit={() => navigate(`/project/${project.id}/edit`)}
                    onRisks={() => navigate(`/project/${project.id}/risks`)}
                    onDelete={(e) => handleDeleteProject(project.id, project.name, e)}
                  />
                </div>

                {/* Content Area */}
                <div className="card-content-area">
                  <span
                    className="card-status-badge"
                    style={{ backgroundColor: statusInfo.color }}
                  >
                    {statusInfo.label}
                  </span>
                  <h3 className="card-project-name">{getDisplayName(project)}</h3>
                  <span className="card-role-text">{getRoleLabel(project)}</span>
                </div>

                {/* Participants */}
                <div className="card-participants">
                  <span className="card-participants-label">Участники:</span>
                  <span className="card-participants-count">
                    <Users size={18} />
                    {participantsCount} чел.
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="card-progress">
                  <div className="card-progress-track">
                    <div
                      className="card-progress-fill"
                      style={{
                        width: `${project.progress}%`,
                        backgroundColor: progressColor
                      }}
                    />
                  </div>
                  <span className="card-progress-text" style={{ color: progressColor }}>
                    {project.progress}%
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="card-actions-row">
                  {canEditProject(project) && (
                    <button
                      className="card-action-btn"
                      onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}/edit`); }}
                      type="button"
                    >
                      <PencilIcon />
                      <span>Редактировать</span>
                    </button>
                  )}
                  <button
                    className="card-action-btn card-action-btn-risks"
                    onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}/risks`); }}
                    type="button"
                  >
                    <WarningIcon />
                    <span>Риски</span>
                  </button>
                </div>

                {/* Date */}
                <div className="card-date">{formatDate(project.lastUpdated)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Return Button */}
      <button
        className={`floating-return ${showReturn ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Return to top"
      >
        ↑
      </button>
    </div>
  );
};

export default Dashboard;
