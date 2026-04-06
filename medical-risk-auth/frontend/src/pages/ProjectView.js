import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './ProjectView.css';
import API_BASE_URL from '../config';

const LIFECYCLE_STAGE_LABELS = {
  design_development: 'Проектирование и разработка',
  procurement: 'Закупка и входной контроль компонентов и материалов',
  production: 'Производство и сборка',
  packaging: 'Упаковка и маркировка',
  installation: 'Монтаж',
  sterilization: 'Стерилизация',
  testing: 'Испытания и выпуск продукции',
  storage: 'Хранение',
  transportation: 'Транспортировка и дистрибуция',
  commissioning: 'Установка и ввод в эксплуатацию',
  operation: 'Эксплуатация',
  maintenance: 'Техническое обслуживание и сервис',
  decommissioning: 'Демонтаж и вывод из эксплуатации',
  disposal: 'Утилизация и уничтожение изделия или его компонентов',
  other: 'Другие'
};

const ProjectView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('specialist');
  const [selectedRoleDoctor, setSelectedRoleDoctor] = useState(false);
  const [selectedLifecycleStages, setSelectedLifecycleStages] = useState([]);
  const [addingMember, setAddingMember] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showEditMemberRole, setShowEditMemberRole] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [roleToEdit, setRoleToEdit] = useState('specialist');
  const [roleToEditDoctor, setRoleToEditDoctor] = useState(false);
  const [lifecycleStagesToEdit, setLifecycleStagesToEdit] = useState([]);

  const normalizeLifecycleStages = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed.filter(Boolean) : [trimmed];
        } catch (error) {
          return [trimmed];
        }
      }
      return [trimmed];
    }
    return [];
  };

  const getMemberLifecycleStages = (member) => {
    const stages = normalizeLifecycleStages(member?.assigned_lifecycle_stages);
    if (stages.length > 0) return stages;
    return normalizeLifecycleStages(member?.assigned_lifecycle_stage);
  };

  const toggleStageInList = (stage, setter) => {
    if (!stage) return;
    setter(prev =>
      prev.includes(stage)
        ? prev.filter(item => item !== stage)
        : [...prev, stage]
    );
  };

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
            
            // Новые поля для 14971 стандарта
            indications: projectData.indications || '',
            contraindications: projectData.contraindications || '',
            targetGroup: projectData.target_group || '',
            warnings: projectData.warnings || '',
            disposal: projectData.disposal || '',
            
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
            hazardQuestions: projectData.hazard_questions || {},
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
            console.log('[MULTI-ROLE] Members loaded from server:', membersData.map(m => ({ user_id: m.user_id, role: m.role, roles: m.roles })));
            const teamMembers = membersData.map(member => ({
              id: member.user_id,
              name: `${member.user_first_name} ${member.user_last_name}`,
              role: member.role,
              roles: member.roles || [member.role],
              assigned_lifecycle_stages: getMemberLifecycleStages(member),
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
    
  }, [id]);

  useEffect(() => {
    // Keep form state consistent with role restrictions when opening member modal.
    if (!showAddMember) return;
    if (isLimitedProjectAdmin()) {
      setSelectedRole('manager');
      setSelectedLifecycleStages([]);
      return;
    }
    if (isProductManager()) {
      setSelectedRole('specialist');
      setSelectedLifecycleStages([]);
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
    // Project owner is always admin
    if (currentUser.id === project.ownerId) return true;
    // Admin and product manager can edit project
    if (project.team.some(member => member.id === currentUser.id && member.role === 'admin')) return true;
    if (project.team.some(member => member.id === currentUser.id && member.role === 'manager')) return true;
    return false;
  };

  const canAddMembers = () => {
    if (!currentUser || !project) return false;
    // SYS_ADMIN can manage all projects
    if (currentUser.role === 'SYS_ADMIN') return true;
    // Project owner is always admin
    if (currentUser.id === project.ownerId) return true;
    // Только администратор проекта управляет участниками и ролями
    if (project.team.some(member => member.id === currentUser.id && member.role === 'admin')) return true;
    return false;
  };

  const canManageRisks = () => {
    if (!currentUser) return false;
    // SYS_ADMIN can manage all risks
    if (currentUser.role === 'SYS_ADMIN') return true;
    // Project owner is always admin
    if (project && currentUser.id === project.ownerId) return true;
    // Admin has full access
    if (project.team.some(member => member.id === currentUser.id && member.role === 'admin')) return true;
    // Product manager can manage risks
    if (project.team.some(member => member.id === currentUser.id && member.role === 'manager')) return true;
    // Specialist can manage risks (in their lifecycle stage only - backend enforces)
    if (project.team.some(member => member.id === currentUser.id && member.role === 'specialist')) return true;
    return false;
  };

  // Администратор больше не ограничен — функция всегда возвращает false
  const isLimitedProjectAdmin = () => false;

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

  const formatLifecycleStageForDisplay = (stage) => {
    if (!stage || typeof stage !== 'string') return '';
    const normalized = stage.trim();
    return LIFECYCLE_STAGE_LABELS[normalized] || normalized;
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
      in_progress: { label: 'В процессе', className: 'status-progress' },
      review: { label: 'На рассмотрении', className: 'status-review' },
      completed: { label: 'Завершено', className: 'status-completed' }
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

  const getProjectRoleBadge = (role, assignedLifecycleStages = [], roles = []) => {
    const roleConfig = {
      admin: { label: 'АДМИНИСТРАТОР', className: 'role-admin' },
      manager: { label: 'ПРОДУКТ-МЕНЕДЖЕР', className: 'role-manager' },
      risk_assessment_team_leader: { label: 'РУКОВОДИТЕЛЬ КОМАНДЫ ПО РИСКАМ', className: 'role-risk-leader' },
      doctor: { label: 'ДОКТОР', className: 'role-doctor' },
      specialist: { label: 'СПЕЦИАЛИСТ ПО ЖЦ', className: 'role-specialist' }
    };

    const config = roleConfig[role] || { label: role?.toUpperCase() || 'UNKNOWN', className: 'role-unknown' };
    const specialistStages = normalizeLifecycleStages(assignedLifecycleStages);
    const displayLabel = role === 'specialist' && specialistStages.length > 0
      ? `${config.label}: ${specialistStages.map(formatLifecycleStageForDisplay).join(', ')}`
      : config.label;
    const hasDoctor = Array.isArray(roles) && roles.includes('doctor') && role !== 'doctor';
    return (
      <>
        <span className={`role-badge ${config.className}`} title={displayLabel}>{displayLabel}</span>
        {hasDoctor && <span className="role-badge role-doctor" title="ДОКТОР" style={{ marginLeft: 4 }}>ДОКТОР</span>}
      </>
    );
  };

  /**
   * Calculate active hazard categories based on hazard questions.
   * This mirrors the backend logic for consistency.
   */
  const calculateActiveHazardCategoriesFromQuestions = (hazardQuestionsJson) => {
    if (!hazardQuestionsJson) {
      return [];
    }
    
    let hazardQuestions;
    try {
      hazardQuestions = typeof hazardQuestionsJson === 'string' 
        ? JSON.parse(hazardQuestionsJson) 
        : hazardQuestionsJson;
    } catch (error) {
      console.error('Failed to parse hazard questions:', error);
      return [];
    }

    // Always active categories
    const activeCategories = new Set([
      'Опасности, связанные с удобством использования',
      'Опасности, связанные с надежностью, отказом конструкции или функций изделия',
      'Опасности клинического применения',
      'Другие'
    ]);
    
    // Mapping questions to categories
    const questionToCategoryMap = {
      // Биосовместимость
      'bodyContact': 'Опасности, связанные с биосовместимостью',
      'materialContact': 'Опасности, связанные с биосовместимостью',
      'implantableDevice': 'Опасности, связанные с биосовместимостью',
      'substanceRelease': 'Опасности, связанные с биосовместимостью',
      'sensitization': 'Опасности, связанные с биосовместимостью',
      'implantable': 'Опасности, связанные с биосовместимостью',
      
      // Безопасность данных и систем
      'containsSoftware': 'Опасности, связанные с безопасностью данных и систем',
      'dataExchange': 'Опасности, связанные с безопасностью данных и систем',
      'wireless': 'Опасности, связанные с безопасностью данных и систем',
      'personalData': 'Опасности, связанные с безопасностью данных и систем',
      'userInterface': 'Опасности, связанные с безопасностью данных и систем',
      'software': 'Опасности, связанные с безопасностью данных и систем',
      
      // Электричество
      'activeDevice': 'Опасности, связанные с электричеством',
      'powerConnection': 'Опасности, связанные с электричеством',
      'electricalContacts': 'Опасности, связанные с электричеством',
      'active': 'Опасности, связанные с электричеством',
      
      // Движущиеся части
      'movingElements': 'Опасности, связанные с движущимися частями',
      'movingRisk': 'Опасности, связанные с движущимися частями',
      
      // Излучение
      'emitsEnergy': 'Опасности, связанные с излучением',
      'opticalSystems': 'Опасности, связанные с излучением',
      
      // Удобство использования (всегда активна)
      'specialTraining': 'Опасности, связанные с удобством использования',
      'specialNeeds': 'Опасности, связанные с удобством использования',
      'interfaceError': 'Опасности, связанные с удобством использования',
      'alarms': 'Опасности, связанные с удобством использования',
      
      // Микробиологические факторы
      'isSterile': 'Опасности, связанные с микробиологическими факторами',
      'reusable': 'Опасности, связанные с микробиологическими факторами',
      'biologicalContact': 'Опасности, связанные с микробиологическими факторами',
      'sterile': 'Опасности, связанные с микробиологическими факторами',
      'disposable': 'Опасности, связанные с микробиологическими факторами',
      
      // Химические вещества
      'chemicalSubstances': 'Опасности, связанные с химическими веществами',
      'chemicalRelease': 'Опасности, связанные с химическими веществами',
      'chemicalSterilization': 'Опасности, связанные с химическими веществами',
      
      // Ткани животного происхождения
      'animalMaterials': 'Опасности, связанные с тканями животного происхождения',
      
      // Наноматериалы
      'nanomaterials': 'Опасности, связанные с наноматериалами',
      
      // Фармацевтические субстанции
      'pharmaceutical': 'Опасности, связанные с фармацевтическими субстанциями',
      
      // Воздействие окружающей среды
      'environmentalSensitivity': 'Опасности, связанные с воздействием окружающей среды',
      'environmentalImpact': 'Опасности, связанные с воздействием окружающей среды',
      
      // Механические факторы
      'mechanicalLoad': 'Опасности, связанные с механическими факторами, физические',
      'destructionRisk': 'Опасности, связанные с механическими факторами, физические',
      
      // Термические воздействия
      'heating': 'Опасности, связанные с термическими воздействиями',
      'surfaceContact': 'Опасности, связанные с термическими воздействиями',
      
      // Клиническое применение (всегда активна)
      'clinicalUse': 'Опасности клинического применения',
      'clinicalError': 'Опасности клинического применения'
    };
    
    // Check each question and add corresponding categories
    Object.entries(hazardQuestions).forEach(([question, is_checked]) => {
      if (is_checked && question in questionToCategoryMap) {
        const category = questionToCategoryMap[question];
        activeCategories.add(category);
      }
    });
    
    return Array.from(activeCategories);
  };

  const handleAddMember = async () => {
    if (!selectedUser) return;
    if (selectedRole === 'specialist' && selectedLifecycleStages.length === 0) {
      alert('Для роли "Специалист" необходимо выбрать минимум один этап жизненного цикла');
      return;
    }

    setAddingMember(true);
    try {
      const token = localStorage.getItem('token');
      const userId = parseInt(selectedUser);

      // Build roles list: primary hierarchical role + optional doctor
      const roles = [selectedRole];
      if (selectedRoleDoctor && selectedRole !== 'doctor') {
        roles.push('doctor');
      }

      const body = {
        user_id: userId,
        role: selectedRole,
        roles: roles
      };
      if (selectedRole === 'specialist') {
        body.assigned_lifecycle_stages = selectedLifecycleStages;
        body.assigned_lifecycle_stage = selectedLifecycleStages[0];
      }

      console.log('[MULTI-ROLE] Sending add member request:', JSON.stringify(body));

      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('[MULTI-ROLE] Server response:', responseData);
        window.location.reload();
        setShowAddMember(false);
        setSelectedUser('');
        setSelectedRole('specialist');
        setSelectedRoleDoctor(false);
        setSelectedLifecycleStages([]);
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
      setSelectedRoleDoctor(false);
      setSelectedLifecycleStages([]);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

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
    if (roleToEdit === 'specialist' && lifecycleStagesToEdit.length === 0) {
      alert('Для роли "Специалист" необходимо выбрать минимум один этап жизненного цикла');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Build roles list: primary hierarchical role + optional doctor
      const roles = [roleToEdit];
      if (roleToEditDoctor && roleToEdit !== 'doctor') {
        roles.push('doctor');
      }

      const body = { role: roleToEdit, roles };
      if (roleToEdit === 'specialist') {
        body.assigned_lifecycle_stages = lifecycleStagesToEdit;
        body.assigned_lifecycle_stage = lifecycleStagesToEdit[0];
      }
      console.log('[MULTI-ROLE] Sending update member request:', JSON.stringify(body));
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
        setRoleToEditDoctor(false);
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

  const availableLifecycleStageValues = [
    ...new Set([
      ...(project.lifecycleStages || []),
      ...(project.customLifecycleStages || [])
    ])
  ].filter(stage => stage && stage !== 'other' && stage !== 'Другие');

  const availableLifecycleStages = availableLifecycleStageValues
    .filter(stage => stage && stage !== 'other' && stage !== 'Другие')
    .map(formatLifecycleStageForDisplay)
    .filter(stage => stage !== 'Другие')
    .filter(Boolean);

  const lifecycleStages = formatList(availableLifecycleStages);

  const hazardCategories = formatList([
    ...new Set([
      ...(project.activeHazardCategories || []),
      ...(project.customHazards || []),
      // Always also derive from checklist answers to avoid partial/legacy stored categories
      ...calculateActiveHazardCategoriesFromQuestions(project.hazardQuestions)
    ])
  ].filter(category => category && category !== 'Другие')
   .map(category => category.replace(' (usability)', '')));

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
              Редактировать проект
            </Link>
          )}
          {canAddMembers() && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedRole('manager');
                setSelectedLifecycleStages([]);
                setShowAddMember(true);
              }}
            >
              ➕ Добавить участника
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/project/${project.id}/table`)}
          >
            Таблица управления рисками
          </button>
          {(isProductManager() || currentUser?.role === 'SYS_ADMIN' || currentUser?.id === project?.ownerId) && (
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/project/${project.id}/documents`)}
            >
              Просмотр документа
            </button>
          )}
          <Link to={`/project/${project.id}/risks`} className="btn btn-primary">
            {canManageRisks() ? 'Управление анализом рисков' : 'Просмотр анализа рисков'}
          </Link>
        </div>
      </div>

      {/* Progress Section */}
      <div className="progress-section">
        <h3>Прогресс проекта</h3>
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
          <span className="progress-text">{project.progress}% Завершено</span>
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
            
            {/* Новые поля для 14971 стандарта */}
            <div className="info-item">
              <label>Показания:</label>
              <span>{project.indications || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Противопоказания:</label>
              <span>{project.contraindications || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Целевая группа:</label>
              <span>{project.targetGroup || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Предупреждения:</label>
              <span>{project.warnings || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Утилизация:</label>
              <span>{project.disposal || 'N/A'}</span>
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
          <h3>Команда проекта</h3>
          <div className="team-list">
            {project.team.map(member => (
              <div key={member.id} className="team-member">
                <div className="member-avatar">
                  <img src={member.avatar} alt={member.name} />
                </div>
                <div className="member-info">
                  <div className="member-name">{member.name}</div>
                  <div className="member-role">{getProjectRoleBadge(member.role, member.assigned_lifecycle_stages, member.roles)}</div>
                  <div className="member-email">{member.email}</div>
                </div>
                <div className="member-actions">
                  {canAddMembers() && member.id !== project.ownerId && (
                    <button
                      className="edit-member-btn"
                      onClick={() => {
                        const memberRoles = member.roles || [member.role];
                        const HIERARCHICAL = ['specialist', 'risk_assessment_team_leader', 'manager'];
                        const primaryRole = memberRoles.find(r => HIERARCHICAL.includes(r)) || (memberRoles.includes('doctor') ? 'doctor' : member.role);
                        setMemberToEdit(member);
                        setRoleToEdit(primaryRole);
                        setRoleToEditDoctor(memberRoles.includes('doctor') && primaryRole !== 'doctor');
                        setLifecycleStagesToEdit(getMemberLifecycleStages(member));
                        setShowEditMemberRole(true);
                      }}
                      title="Edit member role"
                    >
                      ✎
                    </button>
                  )}
                  {canAddMembers() && member.id !== project.ownerId && (
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
          
          {canAddMembers() && (
            <button
              className="add-member-btn"
              onClick={() => {
                setSelectedRole('manager');
                setSelectedLifecycleStages([]);
                setShowAddMember(true);
              }}
            >
              ➕ Добавить участника
            </button>
          )}
        </div>

        {/* Recent Activity removed as requested */}
      </div>

      {/* Metadata */}
        <div className="metadata-section">
          <div className="metadata-item">
            <label>Создано:</label>
            <span>{new Date(project.createdDate).toLocaleDateString()}</span>
          </div>
          <div className="metadata-item">
            <label>Последнее обновление:</label>
            <span>{new Date(project.lastUpdated).toLocaleDateString()}</span>
          </div>
        </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="modal-content member-modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: 'none', overflow: 'visible' }}>
            <div className="modal-header">
              <h2>{isLimitedProjectAdmin() ? 'Назначить продукт-менеджера' : 'Добавить участника проекта'}</h2>
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
                  onChange={(e) => { setSelectedRole(e.target.value); setSelectedLifecycleStages([]); if (e.target.value === 'doctor') setSelectedRoleDoctor(false); }}
                  className="form-select"
                >
                  <option value="manager">Продукт-менеджер</option>
                  <option value="risk_assessment_team_leader">Руководитель команды по рискам</option>
                  <option value="doctor">Доктор</option>
                  <option value="specialist">Специалист по жизненному циклу</option>
                </select>
                <small className="role-description">
                  {selectedRole === 'manager' && 'Заполняет проект, управляет рисками, создаёт отчёты'}
                  {selectedRole === 'risk_assessment_team_leader' && 'Работает с рисками на всех этапах и оценивает вероятность'}
                  {selectedRole === 'doctor' && 'Работает с рисками на всех этапах и оценивает тяжесть вреда'}
                  {selectedRole === 'specialist' && 'Создаёт/редактирует риски только в назначенных этапах жизненного цикла'}
                </small>
              </div>
              {selectedRole !== 'doctor' && (
                <div className="form-group">
                  <label className="lifecycle-stage-checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedRoleDoctor}
                      onChange={(e) => setSelectedRoleDoctor(e.target.checked)}
                    />
                    <span>Также роль доктора (оценивает тяжесть вреда)</span>
                  </label>
                </div>
              )}
              {selectedRole === 'specialist' && (
                <div className="form-group">
                  <label>Этапы жизненного цикла</label>
                  <div className="lifecycle-stage-checkbox-list">
                    {availableLifecycleStageValues.map(stage => (
                      <label key={stage} className="lifecycle-stage-checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedLifecycleStages.includes(stage)}
                          onChange={() => toggleStageInList(stage, setSelectedLifecycleStages)}
                        />
                        <span>{formatLifecycleStageForDisplay(stage)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
        </div>
      )}

      {/* Edit Member Role Modal */}
      {showEditMemberRole && memberToEdit && (
        <div className="modal-overlay" onClick={() => setShowEditMemberRole(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Изменить роль участника</h2>
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
                  onChange={(e) => { setRoleToEdit(e.target.value); setLifecycleStagesToEdit([]); if (e.target.value === 'doctor') setRoleToEditDoctor(false); }}
                  className="form-select"
                >
                  <option value="manager">Продукт-менеджер</option>
                  <option value="risk_assessment_team_leader">Руководитель команды по рискам</option>
                  <option value="doctor">Доктор</option>
                  <option value="specialist">Специалист по жизненному циклу</option>
                </select>
              </div>
              {roleToEdit !== 'doctor' && (
                <div className="form-group">
                  <label className="lifecycle-stage-checkbox-item">
                    <input
                      type="checkbox"
                      checked={roleToEditDoctor}
                      onChange={(e) => setRoleToEditDoctor(e.target.checked)}
                    />
                    <span>Также роль доктора (оценивает тяжесть вреда)</span>
                  </label>
                </div>
              )}
              {roleToEdit === 'specialist' && (
                <div className="form-group">
                  <label>Этапы жизненного цикла</label>
                  <div className="lifecycle-stage-checkbox-list">
                    {availableLifecycleStageValues.map(stage => (
                      <label key={stage} className="lifecycle-stage-checkbox-item">
                        <input
                          type="checkbox"
                          checked={lifecycleStagesToEdit.includes(stage)}
                          onChange={() => toggleStageInList(stage, setLifecycleStagesToEdit)}
                        />
                        <span>{formatLifecycleStageForDisplay(stage)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEditMemberRole(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUpdateMemberRole}
                disabled={!roleToEdit}
              >
                Обновить роль
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating return button */}
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
