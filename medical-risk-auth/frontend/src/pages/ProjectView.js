import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import './ProjectView.css';
import ExcelTable from '../components/ExcelTable';
import API_BASE_URL from '../config';

const ProjectView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('specialist');
  const [selectedLifecycleStage, setSelectedLifecycleStage] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRiskTable, setShowRiskTable] = useState(false);
  const [showEditMemberRole, setShowEditMemberRole] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [roleToEdit, setRoleToEdit] = useState('specialist');
  const [lifecycleStageToEdit, setLifecycleStageToEdit] = useState('');

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const projectData = await response.json();
          
          // Transform API data to frontend format
          const parseJsonArray = (value) => {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
              } catch (error) {
                console.warn('Failed to parse array field:', error);
                return [];
              }
            }
            return [];
          };

          const transformedProject = {
            id: projectData.id,
            name: projectData.name,
            description: projectData.description,
            status: projectData.status,
            progress: projectData.progress_percentage || 0,
            createdDate: projectData.created_at,
            lastUpdated: projectData.updated_at || projectData.created_at,
            ownerId: projectData.owner_id,
            
            // Device Information
            deviceInfo: {
              name: projectData.device_name || 'N/A',
              model: projectData.device_model || 'N/A',
              purpose: projectData.device_purpose || 'N/A',
              description: projectData.device_description || 'N/A',
              classification: projectData.device_classification || 'N/A',
              intendedUse: projectData.intended_use || 'N/A',
              userProfile: projectData.user_profile || 'N/A',
              operatingEnvironment: projectData.operating_environment || 'N/A'
            },

            technicalSpecs: projectData.technical_specs || 'N/A',
            regulatoryRequirements: projectData.regulatory_requirements || 'N/A',
            standards: projectData.standards || 'N/A',

            lifecycleStages: projectData.lifecycle_stages || [],
            customLifecycleStages: projectData.custom_lifecycle_stages || [],
            activeHazardCategories: parseJsonArray(projectData.active_hazard_categories),
            customHazards: projectData.custom_hazard
              ? projectData.custom_hazard.split('\n').map(line => line.trim()).filter(line => line)
              : [],
            readiness: {
              requiredFields: {
                description: projectData.description || '',
                deviceName: projectData.device_name || '',
                deviceModel: projectData.device_model || '',
                devicePurpose: projectData.device_purpose || '',
                deviceDescription: projectData.device_description || '',
                deviceClassification: projectData.device_classification || '',
                operatingEnvironment: projectData.operating_environment || '',
                technicalSpecs: projectData.technical_specs || '',
                regulatoryRequirements: projectData.regulatory_requirements || '',
                standards: projectData.standards || '',
              },
              lifecycleStages: [
                ...(projectData.lifecycle_stages || []),
                ...(projectData.custom_lifecycle_stages || [])
              ],
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
          const membersResponse = await fetch(`${API_BASE_URL}/api/projects/${id}/members`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (membersResponse.ok) {
            const membersData = await membersResponse.json();
            const teamMembers = membersData.map(member => ({
              id: member.user_id,
              name: `${member.user_first_name} ${member.user_last_name}`,
              role: member.role,
              assigned_lifecycle_stage: member.assigned_lifecycle_stage || null,
              email: member.user_email,
              avatar: '/api/placeholder/40/40'
            }));
            
            setProject(prev => ({
              ...prev,
              team: teamMembers
            }));
          }
          
          // Risk coverage progress comes from API (progress_percentage)
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

  useEffect(() => {
    // Keep form state consistent with role restrictions when opening member modal.
    if (!showAddMember) return;
    if (isLimitedProjectAdmin()) {
      setSelectedRole('manager');
      setSelectedLifecycleStage('');
      return;
    }
    if (isProductManager()) {
      setSelectedRole('specialist');
      setSelectedLifecycleStage('');
    }
  }, [showAddMember]);

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
    // Only product manager can continue project filling.
    if (project.team.some(member => member.id === currentUser.id && member.role === 'manager')) return true;
    return false;
  };

  const canAddMembers = () => {
    if (!currentUser || !project) return false;
    // SYS_ADMIN can manage all projects
    if (currentUser.role === 'SYS_ADMIN') return true;
    // Admin can add members
    if (project.team.some(member => member.id === currentUser.id && member.role === 'admin')) return true;
    // Manager can add members only after required project data is filled
    if (project.team.some(member => member.id === currentUser.id && member.role === 'manager')) {
      return isProjectReadyForRoleManagement();
    }
    return false;
  };

  const canManageRisks = () => {
    if (!currentUser) return false;
    // SYS_ADMIN can manage all risks
    if (currentUser.role === 'SYS_ADMIN') return true;
    // Product manager can manage risks
    if (project.team.some(member => member.id === currentUser.id && member.role === 'manager')) return true;
    // Specialist can manage risks (in their lifecycle stage only - backend enforces)
    if (project.team.some(member => member.id === currentUser.id && member.role === 'specialist')) return true;
    return false;
  };

  const isLimitedProjectAdmin = () => {
    if (!currentUser || !project) return false;
    if (currentUser.role === 'SYS_ADMIN') return false;
    return project.team.some(member => member.id === currentUser.id && member.role === 'admin');
  };

  const getCurrentProductManager = () => {
    if (!project?.team) return null;
    return project.team.find(member => member.role === 'manager') || null;
  };

  const isProductManager = () => {
    if (!currentUser || !project) return false;
    if (currentUser.role === 'SYS_ADMIN') return false;
    return project.team.some(member => member.id === currentUser.id && member.role === 'manager');
  };

  const getProjectReadinessMissingFields = () => {
    if (!project?.readiness) return [];
    const fieldLabels = {
      description: 'Описание проекта',
      deviceName: 'Название устройства',
      deviceModel: 'Модель устройства',
      devicePurpose: 'Назначение устройства',
      deviceDescription: 'Описание устройства',
      deviceClassification: 'Классификация устройства',
      operatingEnvironment: 'Условия эксплуатации',
      technicalSpecs: 'Технические характеристики',
      regulatoryRequirements: 'Нормативные требования',
      standards: 'Применимые стандарты',
    };
    const missing = Object.entries(project.readiness.requiredFields)
      .filter(([, value]) => !value || !String(value).trim())
      .map(([key]) => fieldLabels[key] || key);
    if (!project.readiness.lifecycleStages || project.readiness.lifecycleStages.length === 0) {
      missing.push('Этапы жизненного цикла');
    }
    return missing;
  };

  const isProjectReadyForRoleManagement = () => {
    return getProjectReadinessMissingFields().length === 0;
  };

  const formatList = (items) => {
    if (!items || items.length === 0) return 'N/A';
    return items.join(', ');
  };

  const isProjectOwner = () => {
    if (!currentUser || !project) return false;
    return currentUser.id === project.ownerId;
  };

  const loadAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/project-members/selectable`, {
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
      draft: { label: 'Ожидание продукт-менеджера', className: 'status-draft' },
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

  const getProjectRoleBadge = (role, assignedLifecycleStage) => {
    const roleConfig = {
      admin: { label: 'АДМИНИСТРАТОР', className: 'role-admin' },
      manager: { label: 'ПРОДУКТ-МЕНЕДЖЕР', className: 'role-manager' },
      risk_assessment_team_leader: { label: 'РУКОВОДИТЕЛЬ КОМАНДЫ ПО РИСКАМ', className: 'role-risk-leader' },
      doctor: { label: 'ДОКТОР', className: 'role-doctor' },
      specialist: { label: 'СПЕЦИАЛИСТ ПО ЖЦ', className: 'role-specialist' }
    };

    const config = roleConfig[role] || { label: role?.toUpperCase() || 'UNKNOWN', className: 'role-unknown' };
    const displayLabel = role === 'specialist' && assignedLifecycleStage 
      ? `${config.label}: ${assignedLifecycleStage}` 
      : config.label;
    return <span className={`role-badge ${config.className}`} title={displayLabel}>{displayLabel}</span>;
  };

  const handleAddMember = async () => {
    if (!selectedUser) return;
    const isAdminLimited = isLimitedProjectAdmin();
    const isPm = isProductManager();
    const currentManager = getCurrentProductManager();
    if (isPm && !isProjectReadyForRoleManagement()) {
      alert('Сначала заполните обязательные поля проекта и выберите минимум один этап жизненного цикла.');
      return;
    }
    if (isAdminLimited && selectedRole !== 'manager') {
      alert('Администратор проекта может назначить только продукт-менеджера');
      return;
    }
    if (isPm && selectedRole !== 'specialist') {
      if (!['specialist', 'doctor', 'risk_assessment_team_leader'].includes(selectedRole)) {
        alert('Продукт-менеджер может назначать только: доктор, руководитель команды по рискам, специалист.');
        return;
      }
    }
    if (selectedRole === 'specialist' && !selectedLifecycleStage) {
      alert('Для роли "Специалист" необходимо выбрать этап жизненного цикла');
      return;
    }
    
    setAddingMember(true);
    try {
      const token = localStorage.getItem('token');
      const userId = parseInt(selectedUser);
      let endpoint = `${API_BASE_URL}/api/projects/${id}/members`;
      let body = {
        user_id: userId,
        role: selectedRole
      };
      if (selectedRole === 'specialist') {
        body.assigned_lifecycle_stage = selectedLifecycleStage;
      }

      if (isAdminLimited) {
        if (currentManager && currentManager.id !== userId) {
          const confirmed = window.confirm(
            'Вы точно хотите изменить продукт-менеджера? Текущий продукт-менеджер будет заменен.'
          );
          if (!confirmed) {
            setAddingMember(false);
            return;
          }
        }
        endpoint = `${API_BASE_URL}/api/projects/${id}/product-manager`;
        body = { user_id: userId };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        window.location.reload();
        setShowAddMember(false);
        setSelectedUser('');
        setSelectedRole('specialist');
        setSelectedLifecycleStage('');
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.detail || 'Не удалось добавить участника');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Не удалось добавить участника');
    } finally {
      setAddingMember(false);
      setShowAddMember(false);
      setSelectedUser('');
      setSelectedRole('specialist');
      setSelectedLifecycleStage('');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    if (isProductManager()) {
      const member = project?.team?.find(m => m.id === userId);
      if (!member || member.role !== 'specialist') {
        alert('Продукт-менеджер может удалять только специалистов.');
        return;
      }
      if (!isProjectReadyForRoleManagement()) {
        alert('Сначала заполните обязательные поля проекта и выберите минимум один этап жизненного цикла.');
        return;
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/members/${userId}`, {
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

  const handleUpdateMemberRole = async () => {
    if (!memberToEdit) return;
    if (isProductManager()) {
      const allowed = ['specialist', 'doctor', 'risk_assessment_team_leader'];
      if (!allowed.includes(memberToEdit.role) || !allowed.includes(roleToEdit)) {
        alert('Продукт-менеджер может изменять только роли: доктор, руководитель команды по рискам, специалист.');
        return;
      }
      if (!isProjectReadyForRoleManagement()) {
        alert('Сначала заполните обязательные поля проекта и выберите минимум один этап жизненного цикла.');
        return;
      }
    }
    if (isLimitedProjectAdmin() && roleToEdit !== 'manager') {
      alert('Администратор проекта может назначить только продукт-менеджера');
      return;
    }
    if (roleToEdit === 'specialist' && !lifecycleStageToEdit) {
      alert('Для роли "Специалист" необходимо выбрать этап жизненного цикла');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const body = { role: roleToEdit };
      if (roleToEdit === 'specialist') {
        body.assigned_lifecycle_stage = lifecycleStageToEdit;
      }
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/members/${memberToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        window.location.reload();
        setShowEditMemberRole(false);
        setMemberToEdit(null);
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.detail || 'Не удалось обновить роль');
      }
    } catch (error) {
      console.error('Failed to update member role:', error);
      alert('Не удалось обновить роль');
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

  const lifecycleStages = formatList([
    ...new Set([
      ...(project.lifecycleStages || []),
      ...(project.customLifecycleStages || [])
    ])
  ]);

  const hazardCategories = formatList([
    ...new Set([
      ...(project.activeHazardCategories || []),
      ...(project.customHazards || [])
    ])
  ]);

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
          {isLimitedProjectAdmin() && canAddMembers() && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedRole('manager');
                setSelectedLifecycleStage('');
                setShowAddMember(true);
              }}
              style={{ marginRight: '8px' }}
            >
              ➕ Add Product Manager
            </button>
          )}
          {!isLimitedProjectAdmin() && (
            <button 
              className="btn btn-secondary"
              onClick={() => setShowRiskTable(true)}
              style={{ marginRight: '8px' }}
            >
              📊 Risk Management Table
            </button>
          )}
          {!isLimitedProjectAdmin() && (
            <button 
              className="btn btn-secondary"
              onClick={() => navigate(`/project/${project.id}/documents`)}
              style={{ marginRight: '8px' }}
            >
              📄 View Document
            </button>
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
        {/* Project Information */}
        <div className="info-section">
          <h3>Информация о проекте</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Название проекта:</label>
              <span>{project.name || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Описание проекта:</label>
              <span>{project.description || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Название устройства:</label>
              <span>{project.deviceInfo.name}</span>
            </div>
            <div className="info-item">
              <label>Модель устройства:</label>
              <span>{project.deviceInfo.model}</span>
            </div>
            <div className="info-item">
              <label>Назначение устройства:</label>
              <span>{project.deviceInfo.purpose}</span>
            </div>
            <div className="info-item">
              <label>Описание устройства:</label>
              <span>{project.deviceInfo.description}</span>
            </div>
            <div className="info-item">
              <label>Классификация устройства:</label>
              <span>{project.deviceInfo.classification}</span>
            </div>
            <div className="info-item">
              <label>Условия эксплуатации:</label>
              <span>{project.deviceInfo.operatingEnvironment}</span>
            </div>
            <div className="info-item">
              <label>Технические характеристики:</label>
              <span>{project.technicalSpecs}</span>
            </div>
            <div className="info-item">
              <label>Нормативные требования:</label>
              <span>{project.regulatoryRequirements}</span>
            </div>
            <div className="info-item">
              <label>Применимые стандарты:</label>
              <span>{project.standards}</span>
            </div>
          </div>
        </div>

        {/* Lifecycle Stages */}
        <div className="info-section">
          <h3>Этапы жизненного цикла</h3>
          <div className="info-grid">
            <div className="info-item full-width">
              <label>Используемые этапы:</label>
              <span>{lifecycleStages}</span>
            </div>
          </div>
        </div>

        {/* Hazards */}
        <div className="info-section">
          <h3>Опасности проекта</h3>
          <div className="info-grid">
            <div className="info-item full-width">
              <label>Используемые опасности:</label>
              <span>{hazardCategories}</span>
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
                  <div className="member-role">{getProjectRoleBadge(member.role, member.assigned_lifecycle_stage)}</div>
                  <div className="member-email">{member.email}</div>
                </div>
                <div className="member-actions">
                  {!isLimitedProjectAdmin() && canAddMembers() && member.id !== project.ownerId && (!isProductManager() || ['specialist', 'doctor', 'risk_assessment_team_leader'].includes(member.role)) && (
                    <button
                      className="edit-member-btn"
                      onClick={() => {
                        setMemberToEdit(member);
                        setRoleToEdit(member.role);
                        setShowEditMemberRole(true);
                      }}
                      title="Edit member role"
                    >
                      ✎
                    </button>
                  )}
                  {canAddMembers() && member.id !== project.ownerId && (!isProductManager() || ['specialist', 'doctor', 'risk_assessment_team_leader'].includes(member.role)) && (
                    <button 
                      className="remove-member-btn"
                      onClick={() => handleRemoveMember(member.id)}
                      title="Remove from project"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {canAddMembers() && !isLimitedProjectAdmin() && (
            <button 
              className="add-member-btn"
              onClick={() => {
                setSelectedRole(isProductManager() ? 'specialist' : 'manager');
                setSelectedLifecycleStage('');
                setShowAddMember(true);
              }}
            >
              {isLimitedProjectAdmin() ? '➕ Add Product Manager' : '➕ Add member'}
            </button>
          )}
          {isProductManager() && !isProjectReadyForRoleManagement() && (
            <p style={{ marginTop: '10px', color: '#b45309', fontSize: '13px' }}>
              Чтобы добавлять пользователей и назначать роли, сначала заполните обязательные поля проекта и выберите минимум один этап жизненного цикла.
            </p>
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
              <h2>{isLimitedProjectAdmin() ? 'Назначить продукт-менеджера' : 'Add project member'}</h2>
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
                    .filter(user => {
                      if (isLimitedProjectAdmin()) {
                        // Project admin can assign PM from existing or not-yet-added users,
                        // but cannot assign project owner.
                        return user.id !== project.ownerId;
                      }
                      return !project.team.some(member => member.id === user.id);
                    })
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
                  onChange={(e) => { setSelectedRole(e.target.value); setSelectedLifecycleStage(''); }}
                  className="form-select"
                  disabled={isLimitedProjectAdmin()}
                >
                  {isLimitedProjectAdmin() ? (
                    <option value="manager">Продукт-менеджер</option>
                  ) : isProductManager() ? (
                    <>
                      <option value="risk_assessment_team_leader">Руководитель команды по рискам</option>
                      <option value="doctor">Доктор</option>
                      <option value="specialist">Специалист по жизненному циклу</option>
                    </>
                  ) : (
                    <>
                      <option value="manager">Продукт-менеджер</option>
                      <option value="risk_assessment_team_leader">Руководитель команды по рискам</option>
                      <option value="doctor">Доктор</option>
                      <option value="specialist">Специалист по жизненному циклу</option>
                    </>
                  )}
                </select>
                <small className="role-description">
                  {selectedRole === 'manager' && 'Заполняет проект, управляет участниками и рисками, создаёт отчёты'}
                  {selectedRole === 'risk_assessment_team_leader' && 'Работает с рисками на всех этапах и оценивает вероятность'}
                  {selectedRole === 'doctor' && 'Работает с рисками на всех этапах и оценивает тяжесть вреда'}
                  {selectedRole === 'specialist' && 'Создаёт/редактирует риски только в своём этапе жизненного цикла'}
                </small>
              </div>
              {selectedRole === 'specialist' && (
                <div className="form-group">
                  <label>Этап жизненного цикла</label>
                  <select
                    value={selectedLifecycleStage}
                    onChange={(e) => setSelectedLifecycleStage(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Выберите этап...</option>
                    {[...(project.lifecycleStages || []), ...(project.customLifecycleStages || [])].map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
              )}
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

      {/* Edit Member Role Modal */}
      {showEditMemberRole && memberToEdit && (
        <div className="modal-overlay" onClick={() => setShowEditMemberRole(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit member role</h2>
              <button
                className="close-btn"
                onClick={() => setShowEditMemberRole(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Пользователь</label>
                <div className="member-name">{memberToEdit.name}</div>
              </div>
              <div className="form-group">
                <label>Роль в проекте</label>
                <select
                  value={roleToEdit}
                  onChange={(e) => { setRoleToEdit(e.target.value); setLifecycleStageToEdit(''); }}
                  className="form-select"
                >
                  {isProductManager() ? (
                    <>
                      <option value="risk_assessment_team_leader">Руководитель команды по рискам</option>
                      <option value="doctor">Доктор</option>
                      <option value="specialist">Специалист по жизненному циклу</option>
                    </>
                  ) : (
                    <>
                      <option value="manager">Продукт-менеджер</option>
                      <option value="risk_assessment_team_leader">Руководитель команды по рискам</option>
                      <option value="doctor">Доктор</option>
                      {!isLimitedProjectAdmin() && <option value="specialist">Специалист по жизненному циклу</option>}
                    </>
                  )}
                </select>
              </div>
              {roleToEdit === 'specialist' && (
                <div className="form-group">
                  <label>Этап жизненного цикла</label>
                  <select
                    value={lifecycleStageToEdit}
                    onChange={(e) => setLifecycleStageToEdit(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Выберите этап...</option>
                    {[...(project.lifecycleStages || []), ...(project.customLifecycleStages || [])].map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEditMemberRole(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUpdateMemberRole}
                disabled={!roleToEdit}
              >
                Update role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Management Table Modal */}
      {showRiskTable && !isLimitedProjectAdmin() && (
        <ExcelTable
          projectId={parseInt(id)}
          initialSheet={searchParams.get('sheet') || 'first'}
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
