import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
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

  // Load real projects from API
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
        // Преобразуем данные из API в формат для фронтенда
        const formattedProjects = projectsData.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          progress: project.progress_percentage || 0,
          lastUpdated: project.updated_at || project.created_at,
          notifications: 0, // TODO: получать из API
          team: [], // TODO: получать участников проекта
          deviceType: project.device_name,
          userRole: project.user_role,
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

  // Filter projects based on status, role and search term
  useEffect(() => {
    let filtered = projects;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.status === filterStatus);
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter(project => project.userRole === filterRole);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredProjects(filtered);
  }, [projects, filterStatus, filterRole, searchTerm]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Ожидание продукт-менеджера', className: 'status-draft' },
      in_progress: { label: 'В процессе', className: 'status-progress' },
      review: { label: 'На проверке', className: 'status-review' },
      completed: { label: 'Завершено', className: 'status-completed' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: 'АДМИНИСТРАТОР', className: 'role-admin' },
      manager: { label: 'ПРОДУКТ-МЕНЕДЖЕР', className: 'role-manager' },
      risk_assessment_team_leader: { label: 'РУКОВОДИТЕЛЬ КОМАНДЫ ПО РИСКАМ', className: 'role-risk-leader' },
      doctor: { label: 'ДОКТОР', className: 'role-doctor' },
      specialist: { label: 'СПЕЦИАЛИСТ ПО ЖЦ', className: 'role-specialist' }
    };
    
    const config = roleConfig[role] || { label: role?.toUpperCase() || 'UNKNOWN', className: 'role-unknown' };
    return <span className={`role-badge ${config.className}`} title={config.label}>{config.label}</span>;
  };

  const canEditProject = (project) => {
    // Только продукт-менеджер продолжает заполнение проекта.
    return project.userRole === 'manager';
  };

  const canDeleteProject = (project) => {
    // Доступ к удалению проекта:
    // - admin: полный доступ (владелец проекта)
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
        // Удаляем проект из локального состояния
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

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Проекты</h1>
        <p>
          {currentUser?.role === 'SYS_ADMIN' 
            ? 'Управляйте всеми проектами анализа рисков медицинских изделий в системе'
            : 'Управляйте своими проектами анализа рисков медицинских изделий'
          }
        </p>
      </div>

      <div className="dashboard-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Поиск проектов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <label htmlFor="status-filter">Фильтр по статусу:</label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все проекты</option>
            <option value="draft">Черновик</option>
            <option value="in_progress">В процессе</option>
            <option value="review">На проверке</option>
            <option value="completed">Завершено</option>
          </select>
        </div>

        {/* Role filter - only for regular users */}
        {currentUser?.role === 'USER' && (
          <div className="filter-section">
            <label htmlFor="role-filter">Фильтр по моей роли:</label>
            <select
              id="role-filter"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="filter-select"
            >
              <option value="all">Все роли</option>
              <option value="admin">Администратор</option>
              <option value="manager">Продукт-менеджер</option>
              <option value="specialist">Специалист</option>
            </select>
          </div>
        )}

        <div className="view-toggle">
          <span className="view-toggle-label">Вид:</span>
          <div className="view-toggle-group" role="group" aria-label="Project view mode">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('grid')}
              aria-pressed={viewMode === 'grid'}
            >
              <span className="view-toggle-icon">▦</span>
              Карточки
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('list')}
              aria-pressed={viewMode === 'list'}
            >
              <span className="view-toggle-icon">≡</span>
              Список
            </button>
          </div>
        </div>

        <Link to="/project/new" className="add-project-btn">
          ➕ Создать проект
        </Link>
      </div>

      <div className={`projects-grid ${viewMode === 'list' ? 'list' : ''}`}>
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>Проекты не найдены</h3>
            <p>
              {currentUser?.role === 'SYS_ADMIN'
                ? 'Проекты еще не созданы. Пользователи могут создать свои первые проекты.'
                : 'Создайте свой первый проект для начала анализа рисков'
              }
            </p>
            <Link to="/project/new" className="btn btn-primary">
              Создать проект
            </Link>
          </div>
        ) : viewMode === 'list' ? (
          filteredProjects.map(project => (
            <div
              key={project.id}
              className="project-row"
              onClick={() => handleProjectClick(project.id)}
            >
              <div className="project-row-name">
                <span>{project.name}</span>
              </div>
              <div className="project-row-role">
                {project.userRole && getRoleBadge(project.userRole)}
              </div>
              <div className="project-row-team">
                {project.memberCount + 1} участников
              </div>
              <div className="project-row-progress">
                {project.progress}%
              </div>
              <div className="project-row-actions">
                {canEditProject(project) && (
                  <button
                    className="action-btn edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/project/${project.id}/edit`);
                    }}
                  >
                    Редактировать
                  </button>
                )}
                <button
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/project/${project.id}/risks`);
                  }}
                >
                  Риски
                </button>
                {canDeleteProject(project) && (
                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => handleDeleteProject(project.id, project.name, e)}
                    title="Delete project"
                  >
                    Удалить
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          filteredProjects.map(project => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => handleProjectClick(project.id)}
            >
              <div className="project-header">
                <div className="project-title">
                  <h3>{project.name}</h3>
                  {project.notifications > 0 && (
                    <div className="notification-badge">
                      {project.notifications}
                    </div>
                  )}
                </div>
                <div className="project-badges">
                  {getStatusBadge(project.status)}
                  {project.userRole && getRoleBadge(project.userRole)}
                </div>
              </div>

              <div className="project-description">
                <p>{project.description}</p>
              </div>

              <div className="project-details">
                <div className="device-type">
                  <span className="label">Устройство:</span>
                  <span className="value">{project.deviceType}</span>
                </div>
                
                <div className="team-info">
                  <span className="label">Размер команды:</span>
                  <span className="value">{project.memberCount + 1} участников</span>
                </div>
              </div>

              <div className="project-progress">
                <div className="progress-header">
                  <span>Прогресс</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="project-footer">
                <span className="last-updated">
                  Обновлено: {new Date(project.lastUpdated).toLocaleDateString()}
                </span>
                <div className="project-actions">
                  {canEditProject(project) && (
                    <button
                      className="action-btn edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/project/${project.id}/edit`);
                      }}
                    >
                      Редактировать
                    </button>
                  )}
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/project/${project.id}/risks`);
                    }}
                  >
                    Риски
                  </button>
                  {canDeleteProject(project) && (
                    <button
                      className="action-btn delete-btn"
                      onClick={(e) => handleDeleteProject(project.id, project.name, e)}
                      title="Delete project"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
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
