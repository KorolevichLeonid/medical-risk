import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Grid3X3, List, Pencil, AlertTriangle, MoreVertical, Users, ChevronDown, ChevronUp } from 'lucide-react';
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
        <MoreVertical size={20} />
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
            <Grid3X3 size={18} />
            <span className="view-toggle-tooltip">Табличный вид</span>
          </button>
          <div className="view-toggle-divider" />
          <button
            className={`view-toggle-btn-new ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('list')}
            type="button"
          >
            <List size={18} />
            <span className="view-toggle-tooltip">Строчный вид</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {!hasAnyProjects ? (
        /* Empty State — no projects at all */
        <div className="empty-state-new">
          <div className="empty-state-icon">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
              <path
                d="M1.5 2.75C1.5 2.55109 1.57902 2.36032 1.71967 2.21967C1.86032 2.07902 2.05109 2 2.25 2H5.25C5.44891 2 5.63968 2.07902 5.78033 2.21967C5.92098 2.36032 6 2.55109 6 2.75V13.25C6 13.664 5.664 14 5.25 14H2.25C2.05109 14 1.86032 13.921 1.71967 13.7803C1.57902 13.6397 1.5 13.4489 1.5 13.25V2.75ZM6.5 2.75C6.5 2.336 6.836 2 7.25 2H8.75C9.164 2 9.5 2.336 9.5 2.75V13.25C9.5 13.664 9.164 14 8.75 14H7.25C6.836 14 6.5 13.664 6.5 13.25V2.75ZM11.25 2C10.836 2 10.5 2.336 10.5 2.75V13.25C10.5 13.664 10.836 14 11.25 14H13.75C14.164 14 14.5 13.664 14.5 13.25V2.75C14.5 2.336 14.164 2 13.75 2H11.25Z"
                fill="#11C1DD"
              />
            </svg>
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
        <div className="table-container">
          <div className="table-list">
            {/* Header */}
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

            {/* Rows */}
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
                    <div className="table-actions-menu-row">
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
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        className="table-action-icon"
                        onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}/risks`); }}
                        title="Риски"
                        type="button"
                      >
                        <AlertTriangle size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
                      <Pencil size={15} />
                      <span>Редактировать</span>
                    </button>
                  )}
                  <button
                    className="card-action-btn card-action-btn-risks"
                    onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}/risks`); }}
                    type="button"
                  >
                    <AlertTriangle size={15} />
                    <span>Риски</span>
                  </button>
                  {canDeleteProject(project) && (
                    <button
                      className="card-action-btn card-action-btn-delete"
                      onClick={(e) => handleDeleteProject(project.id, project.name, e)}
                      type="button"
                    >
                      Удалить
                    </button>
                  )}
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
