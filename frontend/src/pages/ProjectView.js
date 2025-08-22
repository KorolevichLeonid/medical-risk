import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './ProjectView.css';

const ProjectView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('doctor');
  const [addingMember, setAddingMember] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/projects/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const projectData = await response.json();
          
          // Transform API data to frontend format
          const transformedProject = {
            id: projectData.id,
            name: projectData.name,
            description: projectData.description,
            status: projectData.status,
            progress: projectData.progress_percentage || 0,
            createdDate: projectData.created_at,
            lastUpdated: projectData.updated_at || projectData.created_at,
            
            // Device Information
            deviceInfo: {
              name: projectData.device_name,
              model: projectData.device_model || 'N/A',
              purpose: projectData.device_purpose || 'N/A',
              description: projectData.device_description || 'N/A',
              classification: projectData.device_classification || 'N/A',
              intendedUse: projectData.intended_use || 'N/A',
              userProfile: projectData.user_profile || 'N/A',
              operatingEnvironment: projectData.operating_environment || 'N/A'
            },
            
            // Team Members - will be loaded separately
            team: [],
            
            // Project Statistics - will be loaded separately
            statistics: {
              totalRisks: 0,
              highRisks: 0,
              mediumRisks: 0,
              lowRisks: 0,
              mitigatedRisks: 0,
              pendingActions: 0
            },
            
            // Recent Activity - placeholder for now
            recentActivity: []
          };
          
          setProject(transformedProject);
          
          // Load project members
          const membersResponse = await fetch(`http://localhost:8000/api/projects/${id}/members`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (membersResponse.ok) {
            const membersData = await membersResponse.json();
            const teamMembers = membersData.map(member => ({
              id: member.user_id,
              name: `${member.user_first_name} ${member.user_last_name}`,
              role: member.role, // Keep original role (admin, manager, doctor)
              email: member.user_email,
              avatar: '/api/placeholder/40/40'
            }));
            
            setProject(prev => ({
              ...prev,
              team: teamMembers
            }));
          }
          
          // Load risk statistics
          const risksResponse = await fetch(`http://localhost:8000/api/risk-analyses/project/${id}/factors`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (risksResponse.ok) {
            const risksData = await risksResponse.json();
            const totalRisks = risksData.length;
            const highRisks = risksData.filter(risk => risk.risk_score >= 15).length;
            const mediumRisks = risksData.filter(risk => risk.risk_score >= 10 && risk.risk_score < 15).length;
            const lowRisks = risksData.filter(risk => risk.risk_score < 10).length;
            
            setProject(prev => ({
              ...prev,
              statistics: {
                totalRisks: totalRisks,
                highRisks: highRisks,
                mediumRisks: mediumRisks,
                lowRisks: lowRisks,
                mitigatedRisks: 0, // TODO: implement mitigation tracking
                pendingActions: 0 // TODO: implement action tracking
              }
            }));
          }
        } else if (response.status === 403) {
          setProject(null);
          alert('You do not have access to this project');
        } else if (response.status === 404) {
          setProject(null);
        } else {
          console.error('Failed to load project:', response.status);
          setProject(null);
        }
      } catch (error) {
        console.error('Failed to load project:', error);
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
    fetchProject();
    loadAvailableUsers();
  }, [id]);

  const loadCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  };

  // Permission check functions
  const canEditProject = () => {
    if (!currentUser || !project) return false;
    // SYS_ADMIN can edit all projects
    if (currentUser.role === 'SYS_ADMIN') return true;
    // Project owner can edit
    if (project.team.some(member => member.id === currentUser.id && member.role === 'admin')) return true;
    // Project managers can edit
    if (project.team.some(member => member.id === currentUser.id && member.role === 'manager')) return true;
    return false;
  };

  const canAddMembers = () => {
    if (!currentUser || !project) return false;
    // SYS_ADMIN can manage all projects
    if (currentUser.role === 'SYS_ADMIN') return true;
    // Project owner can add members
    if (project.team.some(member => member.id === currentUser.id && member.role === 'admin')) return true;
    // Project managers can add members
    if (project.team.some(member => member.id === currentUser.id && member.role === 'manager')) return true;
    return false;
  };

  const canManageRisks = () => {
    if (!currentUser) return false;
    // SYS_ADMIN can manage all risks
    if (currentUser.role === 'SYS_ADMIN') return true;
    // Project admins can manage risks
    if (project.team.some(member => member.id === currentUser.id && member.role === 'admin')) return true;
    // Doctors can manage risks
    if (project.team.some(member => member.id === currentUser.id && member.role === 'doctor')) return true;
    return false;
  };

  const loadAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const usersData = await response.json();
        const formattedUsers = usersData
          .filter(user => user.is_active)
          .map(user => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`.trim() || user.email,
            email: user.email,
            role: user.role
          }));
        setAvailableUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Draft', className: 'status-draft' },
      in_progress: { label: 'In Progress', className: 'status-progress' },
      review: { label: 'Under Review', className: 'status-review' },
      completed: { label: 'Completed', className: 'status-completed' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      high: '#FF4444',
      medium: '#FF8800',
      low: '#00AA44'
    };
    return colors[level] || '#9A9B9F';
  };

  const getProjectRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: 'Админ проекта', className: 'project-role-admin' },
      manager: { label: 'Менеджер', className: 'project-role-manager' },
      doctor: { label: 'Доктор', className: 'project-role-doctor' }
    };
    
    const config = roleConfig[role] || { label: 'Участник', className: 'project-role-member' };
    return <span className={`project-role-badge ${config.className}`}>{config.label}</span>;
  };

  const handleAddMember = async () => {
    if (!selectedUser) return;
    
    setAddingMember(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/projects/${id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: parseInt(selectedUser),
          role: selectedRole
        })
      });

      if (response.ok) {
        // Reload project data to show new member
        window.location.reload();
        setShowAddMember(false);
        setSelectedUser('');
        setSelectedRole('doctor');
      } else {
        alert('Failed to add member to project');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member to project');
    } finally {
      setAddingMember(false);
      setShowAddMember(false);
      setSelectedUser('');
      setSelectedRole('doctor');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/projects/${id}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Reload project data to refresh team members
        window.location.reload();
      } else {
        console.error('Failed to remove member:', response.status);
        alert('Failed to remove team member');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove team member');
    }
  };

  if (loading) {
    return (
      <div className="project-view">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-view">
        <div className="error-state">
          <h2>Project not found</h2>
          <p>The requested project could not be found.</p>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="project-view">
      {/* Project Header */}
      <div className="project-header">
        <div className="header-main">
          <div className="project-title">
            <h1>{project.name}</h1>
            {getStatusBadge(project.status)}
          </div>
          <p className="project-description">{project.description}</p>
        </div>
        
                 <div className="header-actions">
           {canEditProject() && (
             <Link to={`/project/${project.id}/edit`} className="btn btn-secondary">
               Edit Project
             </Link>
           )}
           <Link to={`/project/${project.id}/risks`} className="btn btn-primary">
             {canManageRisks() ? 'Manage Risk Analysis' : 'View Risk Analysis'}
           </Link>
         </div>
      </div>

      {/* Progress Section */}
      <div className="progress-section">
        <h3>Project Progress</h3>
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
          <span className="progress-text">{project.progress}% Complete</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Device Information */}
        <div className="info-section">
          <h3>Device Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Device Name:</label>
              <span>{project.deviceInfo.name}</span>
            </div>
            <div className="info-item">
              <label>Model:</label>
              <span>{project.deviceInfo.model}</span>
            </div>
            <div className="info-item">
              <label>Classification:</label>
              <span>{project.deviceInfo.classification}</span>
            </div>
            <div className="info-item">
              <label>Intended Use:</label>
              <span>{project.deviceInfo.intendedUse}</span>
            </div>
            <div className="info-item full-width">
              <label>Purpose:</label>
              <span>{project.deviceInfo.purpose}</span>
            </div>
            <div className="info-item full-width">
              <label>Description:</label>
              <span>{project.deviceInfo.description}</span>
            </div>
          </div>
        </div>

        {/* Risk Statistics */}
        <div className="stats-section">
          <h3>Risk Assessment Overview</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{project.statistics.totalRisks}</div>
              <div className="stat-label">Total Risks</div>
            </div>
            <div className="stat-card high-risk">
              <div className="stat-number">{project.statistics.highRisks}</div>
              <div className="stat-label">High Risk</div>
            </div>
            <div className="stat-card medium-risk">
              <div className="stat-number">{project.statistics.mediumRisks}</div>
              <div className="stat-label">Medium Risk</div>
            </div>
            <div className="stat-card low-risk">
              <div className="stat-number">{project.statistics.lowRisks}</div>
              <div className="stat-label">Low Risk</div>
            </div>
          </div>
          
          <div className="mitigation-stats">
            <div className="mitigation-item">
              <span className="mitigation-label">Mitigated Risks:</span>
              <span className="mitigation-value">{project.statistics.mitigatedRisks}</span>
            </div>
            <div className="mitigation-item">
              <span className="mitigation-label">Pending Actions:</span>
              <span className="mitigation-value pending">{project.statistics.pendingActions}</span>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="team-section">
          <h3>Project Team</h3>
          <div className="team-list">
            {project.team.map(member => (
              <div key={member.id} className="team-member">
                <div className="member-avatar">
                  <img src={member.avatar} alt={member.name} />
                </div>
                <div className="member-info">
                  <div className="member-name">{member.name}</div>
                  <div className="member-role">{getProjectRoleBadge(member.role)}</div>
                  <div className="member-email">{member.email}</div>
                </div>
                {canAddMembers() && member.role !== 'admin' && (
                  <button 
                    className="remove-member-btn"
                    onClick={() => handleRemoveMember(member.id)}
                    title="Удалить из проекта"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {canAddMembers() && (
            <button 
              className="add-member-btn"
              onClick={() => setShowAddMember(true)}
            >
              ➕ Добавить участника
            </button>
          )}
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {project.recentActivity.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className={`activity-icon ${activity.type}`}>
                  {activity.type === 'update' && '📝'}
                  {activity.type === 'team' && '👥'}
                  {activity.type === 'approval' && '✅'}
                  {activity.type === 'risk' && '⚠️'}
                </div>
                <div className="activity-content">
                  <div className="activity-action">{activity.action}</div>
                  <div className="activity-meta">
                    by {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Metadata */}
      <div className="metadata-section">
        <div className="metadata-item">
          <label>Created:</label>
          <span>{new Date(project.createdDate).toLocaleDateString()}</span>
        </div>
        <div className="metadata-item">
          <label>Last Updated:</label>
          <span>{new Date(project.lastUpdated).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Добавить участника проекта</h2>
              <button 
                className="close-btn"
                onClick={() => setShowAddMember(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Выберите пользователя</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="form-select"
                >
                  <option value="">Выберите пользователя...</option>
                  {availableUsers
                    .filter(user => !project.team.some(member => member.id === user.id))
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))
                  }
                </select>
              </div>
              
              <div className="form-group">
                <label>Роль в проекте</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="form-select"
                >
                  <option value="doctor">Доктор - управление рисками</option>
                  <option value="manager">Менеджер - управление проектом и пользователями</option>
                </select>
                <small className="role-description">
                  {selectedRole === 'doctor' && 'Может добавлять, редактировать и удалять риски'}
                  {selectedRole === 'manager' && 'Может редактировать проект и управлять участниками'}
                </small>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowAddMember(false)}
              >
                Отмена
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleAddMember}
                disabled={!selectedUser || addingMember}
              >
                {addingMember ? 'Добавление...' : 'Добавить участника'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectView;
