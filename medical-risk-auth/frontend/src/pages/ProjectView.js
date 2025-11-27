import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import './ProjectView.css';
import ExcelTable from '../components/ExcelTable';

const ProjectView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('doctor');
  const [addingMember, setAddingMember] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRiskTable, setShowRiskTable] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/projects/${id}`, {
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
    
    // Check if we need to open risk table from URL params
    const openRiskTable = searchParams.get('openRiskTable');
    if (openRiskTable === 'true') {
      setShowRiskTable(true);
    }
  }, [id, searchParams]);

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
    // Project managers can manage risks
    if (project.team.some(member => member.id === currentUser.id && member.role === 'manager')) return true;
    // Doctors can only view risks, not manage them
    return false;
  };

  const loadAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users/project-members/selectable', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const usersData = await response.json();
        setAvailableUsers(usersData); // Data is already formatted correctly
      } else {
        console.error('Failed to load users:', response.status);
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setAvailableUsers([]);
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
      admin: { label: 'ADMIN', className: 'role-admin' },
      manager: { label: 'MANAGER', className: 'role-manager' },
      doctor: { label: 'DOCTOR', className: 'role-doctor' },
      product_manager: { label: 'PRODUCT MANAGER', className: 'role-product-manager' },
      risk_assessment_team_leader: { label: 'RISK ASSESSMENT TEAM LEADER', className: 'role-risk-leader' },
      quality_management_representative: { label: 'QUALITY MANAGMENT REPRESENTATIVE', className: 'role-quality-rep' },
      risk_assessment_team_member: { label: 'RISK ASSESSMENT TEAM MEMBER', className: 'role-risk-member' }
    };

    const config = roleConfig[role] || { label: role?.toUpperCase() || 'UNKNOWN', className: 'role-unknown' };
    return <span className={`role-badge ${config.className}`} title={config.label}>{config.label}</span>;
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
          <button 
            className="btn btn-secondary"
            onClick={() => setShowRiskTable(true)}
            style={{ marginRight: '8px' }}
          >
            📊 Risk Management Table
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate(`/project/${project.id}/documents`)}
            style={{ marginRight: '8px' }}
          >
            📄 View Document
          </button>
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
                    title="Remove from project"
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
              ➕ Add member
            </button>
          )}
        </div>

        {/* Recent Activity removed as requested */}
      </div>

      {/* Metadata */}
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
              <h2>Add project member</h2>
              <button 
                className="close-btn"
                onClick={() => setShowAddMember(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Select user</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select a user...</option>
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
                <label>Project role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="form-select"
                >
                  <option value="doctor">Clinical Evaluation / Doctor - risk management</option>
                  <option value="manager">Top Manager - project and users management</option>
                  <option value="quality_management_representative">Quality Management Representative</option>
                  <option value="product_manager">Product Manager / Quality Manager</option>
                  <option value="risk_assessment_team_leader">Risk Assessment Team Leader</option>
                  <option value="risk_assessment_team_member">Member of the Risk Assessment Team</option>
                </select>
                <small className="role-description">
                  {selectedRole === 'doctor' && 'Can view risks and edit risk evaluation table'}
                  {selectedRole === 'manager' && 'Can edit project, manage members and risks'}
                  {selectedRole === 'quality_management_representative' && 'Can view all blocks, create RMF, chat/comment'}
                  {selectedRole === 'product_manager' && 'Can view all blocks, edit source data'}
                  {selectedRole === 'risk_assessment_team_leader' && 'Can view all, edit source/risk data, verify reports, chat'}
                  {selectedRole === 'risk_assessment_team_member' && 'Can view all blocks, edit risk values'}
                </small>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowAddMember(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleAddMember}
                disabled={!selectedUser || addingMember}
              >
                {addingMember ? 'Adding...' : 'Add member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Management Table Modal */}
      {showRiskTable && (
        <ExcelTable
          projectId={parseInt(id)}
          initialSheet={searchParams.get('sheet') || 'operation'}
          onClose={() => {
            setShowRiskTable(false);
            // Clear URL params
            searchParams.delete('openRiskTable');
            searchParams.delete('sheet');
            searchParams.delete('riskId');
            setSearchParams(searchParams);
          }}
        />
      )}

      {/* Floating return button like Personal Account */}
      <button
        className={`floating-return visible`}
        onClick={() => {
          const content = document.querySelector('.content-body');
          if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Return to top"
      >
        ↑
      </button>
    </div>
  );
};

export default ProjectView;
