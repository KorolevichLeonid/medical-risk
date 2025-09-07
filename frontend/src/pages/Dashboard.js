import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
      const response = await fetch('http://localhost:8000/api/projects/', {
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
      draft: { label: 'Draft', className: 'status-draft' },
      in_progress: { label: 'In Progress', className: 'status-progress' },
      review: { label: 'Review', className: 'status-review' },
      completed: { label: 'Completed', className: 'status-completed' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: 'Admin', className: 'role-admin' },
      manager: { label: 'Manager', className: 'role-manager' },
      doctor: { label: 'Doctor', className: 'role-doctor' }
    };
    
    const config = roleConfig[role] || { label: role, className: 'role-unknown' };
    return <span className={`role-badge ${config.className}`}>{config.label}</span>;
  };

  const canEditProject = (project) => {
    // Доступ к редактированию проекта:
    // - admin: полный доступ
    // - manager: может редактировать информацию проекта
    // - doctor: НЕ может редактировать
    return project.userRole === 'admin' || project.userRole === 'manager';
  };

  const handleProjectClick = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  const scrollToTop = () => {
    const content = document.querySelector('.content-body');
    if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Projects Dashboard</h1>
        <p>
          {currentUser?.role === 'SYS_ADMIN' 
            ? 'Manage all medical device risk analysis projects in the system'
            : 'Manage your medical device risk analysis projects'
          }
        </p>
      </div>

      <div className="dashboard-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <label htmlFor="status-filter">Filter by status:</label>
          <select
            id="status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Projects</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Role filter - only for regular users */}
        {currentUser?.role === 'USER' && (
          <div className="filter-section">
            <label htmlFor="role-filter">Filter by my role:</label>
            <select
              id="role-filter"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="manager">Manager</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>
        )}

        <Link to="/project/new" className="add-project-btn">
          ➕ Create project
        </Link>
      </div>

      <div className="projects-grid">
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No projects found</h3>
            <p>
              {currentUser?.role === 'SYS_ADMIN'
                ? 'No projects in the system yet. Users can create their first projects.'
                : 'Create your first project to get started with risk analysis'
              }
            </p>
            <Link to="/project/new" className="btn btn-primary">
              Create Project
            </Link>
          </div>
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
                  <span className="label">Device:</span>
                  <span className="value">{project.deviceType}</span>
                </div>
                
                <div className="team-info">
                  <span className="label">Team size:</span>
                  <span className="value">{project.memberCount + 1} members</span>
                </div>
              </div>

              <div className="project-progress">
                <div className="progress-header">
                  <span>Progress</span>
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
                  Updated: {new Date(project.lastUpdated).toLocaleDateString()}
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
                      Edit
                    </button>
                  )}
                  <button 
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/project/${project.id}/risks`);
                    }}
                  >
                    Risks
                  </button>
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
