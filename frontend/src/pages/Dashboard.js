import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Load real projects from API
  useEffect(() => {
    loadProjects();
    loadCurrentUser();
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
          deviceType: project.device_name
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

  // Filter projects based on status and search term
  useEffect(() => {
    let filtered = projects;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.status === filterStatus);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredProjects(filtered);
  }, [projects, filterStatus, searchTerm]);

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

  const handleProjectClick = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Projects Dashboard</h1>
        <p>Manage your medical device risk analysis projects</p>
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

        <Link to="/project/new" className="add-project-btn">
          ➕ Создать проект
        </Link>
      </div>

      <div className="projects-grid">
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No projects found</h3>
            <p>
              {(currentUser?.role === 'admin' || currentUser?.role === 'sys_admin')
                ? 'Create your first project to get started with risk analysis'
                : 'No projects available. Contact administrator to create projects.'
              }
            </p>
            {currentUser?.role === 'admin' && (
              <Link to="/project/new" className="btn btn-primary">
                Create Project
              </Link>
            )}
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
                {getStatusBadge(project.status)}
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
                  <span className="label">Team:</span>
                  <span className="value">{project.team.join(', ')}</span>
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
                              {(currentUser?.role === 'admin' || currentUser?.role === 'sys_admin' || currentUser?.role === 'manager') && (
              <button 
                className="action-btn"
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
    </div>
  );
};

export default Dashboard;
