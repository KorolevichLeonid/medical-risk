


import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './RiskAnalysis.css';
import API_BASE_URL from '../config';

const RiskAnalysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [lifecycleStages, setLifecycleStages] = useState([]);
  const [selectedHazardCategories, setSelectedHazardCategories] = useState([]); // Категории опасностей из чеклиста
  const [risks, setRisks] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [riskThreshold, setRiskThreshold] = useState(10);
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [showEditRisk, setShowEditRisk] = useState(false);
  const [showViewRisk, setShowViewRisk] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProjectRole, setUserProjectRole] = useState(null);
  const [assignedLifecycleStages, setAssignedLifecycleStages] = useState([]);
  const [newRisk, setNewRisk] = useState({
    lifecycleStage: '',
    hazardName: '',
    hazardousS: '',
    sequenceOfEvents: '',
    harm: '',
    hazardCategory: ''  // Будет выбираться из active_hazard_categories проекта
    // severityScore, probabilityScore, and controlMeasures are now managed in the risk table
  });



  useEffect(() => {
    loadCurrentUser();
    loadProjectAndRisks();
    loadUserProjectRole();

    // Логирование данных пользователя в консоль
    const logUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/users/me/permissions?project_id=${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('Данные пользователя (RiskAnalysis):', userData);
          console.log('Разрешения пользователя (RiskAnalysis):', userData.permissions);
        }
      } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
      }
    };

    logUserData();
  }, [id]);

  const loadCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  };

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

  const loadUserProjectRole = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/my-role`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const roleData = await response.json();
        console.log('Loaded user project role:', roleData);
        setUserProjectRole(roleData.user_role);
        const stagesFromApi = normalizeLifecycleStages(roleData.assigned_lifecycle_stages);
        setAssignedLifecycleStages(
          stagesFromApi.length > 0
            ? stagesFromApi
            : normalizeLifecycleStages(roleData.assigned_lifecycle_stage)
        );
      } else {
        console.error('Failed to load user project role - status:', response.status);
        setUserProjectRole(null);
        setAssignedLifecycleStages([]);
      }
    } catch (error) {
      console.error('Failed to load user project role:', error);
      setUserProjectRole(null);
      setAssignedLifecycleStages([]);
    }
  };

  // Permission check functions
  const canAddRisks = () => {
    if (!currentUser || !userProjectRole) {
      return false;
    }
    // System admin can always manage risks
    if (currentUser.role === 'SYS_ADMIN') return true;
    // Product manager, risk team leader, and specialists can add risks.
    return ['manager', 'risk_assessment_team_leader', 'specialist'].includes(userProjectRole);
  };

  const canEditRisks = () => {
    if (!currentUser || !userProjectRole) {
      return false;
    }
    // System admin can always manage risks
    if (currentUser.role === 'SYS_ADMIN') return true;
    // Product manager, risk team leader, and specialists can edit risks.
    return ['manager', 'risk_assessment_team_leader', 'specialist'].includes(userProjectRole);
  };

  const canDeleteRisks = () => {
    if (!currentUser || !userProjectRole) {
      return false;
    }
    // System admin can always manage risks
    if (currentUser.role === 'SYS_ADMIN') return true;
    // Product manager, risk team leader, and specialists can delete risks.
    return ['manager', 'risk_assessment_team_leader', 'specialist'].includes(userProjectRole);
  };

  const canOpenRiskTable = () => {
    if (!currentUser || !userProjectRole) {
      return false;
    }
    if (currentUser.role === 'SYS_ADMIN') return true;
    return ['manager', 'risk_assessment_team_leader', 'doctor', 'specialist'].includes(userProjectRole);
  };

  useEffect(() => {
    filterRisks();
  }, [risks, filterSeverity, filterCategory, searchTerm, userProjectRole, assignedLifecycleStages]);

  useEffect(() => {
    if (userProjectRole !== 'specialist' || assignedLifecycleStages.length === 0) {
      return;
    }

    setNewRisk(prev => ({
      ...prev,
      lifecycleStage: assignedLifecycleStages.includes(prev.lifecycleStage)
        ? prev.lifecycleStage
        : assignedLifecycleStages[0]
    }));
  }, [userProjectRole, assignedLifecycleStages]);

  const loadProjectAndRisks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Load project data
      const projectResponse = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProject({
          id: projectData.id,
          name: projectData.name,
          deviceName: projectData.device_name,
          hazardQuestions: projectData.hazard_questions || {},
          lifecycleStages: projectData.lifecycle_stages || [],
          customLifecycleStages: projectData.custom_lifecycle_stages || [],
          activeHazardCategories: projectData.active_hazard_categories || []
        });
        setRiskThreshold(projectData.risk_threshold || projectData.acceptable_risk_level || 10);

        // Load lifecycle stages
        const stages = [];
        if (projectData.lifecycle_stages) {
          if (Array.isArray(projectData.lifecycle_stages)) {
            stages.push(...projectData.lifecycle_stages);
          } else if (typeof projectData.lifecycle_stages === 'string') {
            stages.push(...JSON.parse(projectData.lifecycle_stages));
          }
        }
        if (projectData.custom_lifecycle_stages) {
          if (Array.isArray(projectData.custom_lifecycle_stages)) {
            stages.push(...projectData.custom_lifecycle_stages);
          } else if (typeof projectData.custom_lifecycle_stages === 'string') {
            stages.push(...JSON.parse(projectData.custom_lifecycle_stages));
          }
        }
        setLifecycleStages(stages);
        
        // Load active hazard categories from project
        const hazardCategories = [];
        console.log('=== LOADING PROJECT DATA ===');
        console.log('Raw projectData.active_hazard_categories:', projectData.active_hazard_categories);
        console.log('Type of projectData.active_hazard_categories:', typeof projectData.active_hazard_categories);
        console.log('Full projectData object keys:', Object.keys(projectData));
        console.log('Full projectData object:', projectData);
        
        // Проверяем все возможные источники категорий опасностей
        let categoriesSource = null;
        
        if (projectData.active_hazard_categories) {
          categoriesSource = projectData.active_hazard_categories;
          console.log('Using active_hazard_categories field');
        } else if (projectData.hazard_categories) {
          categoriesSource = projectData.hazard_categories;
          console.log('Using hazard_categories field (fallback)');
        } else if (projectData.hazardQuestions) {
          // Пытаемся извлечь категории из hazardQuestions
          const questions = projectData.hazardQuestions;
          const extractedCategories = [];
          
          // Проверяем все возможные поля с категориями
          const categoryFields = [
            'hazardCategories', 'activeHazardCategories', 'selectedHazardCategories',
            'hazard_categories', 'active_hazard_categories', 'selected_hazard_categories'
          ];
          
          for (const field of categoryFields) {
            if (questions[field]) {
              categoriesSource = questions[field];
              console.log(`Using ${field} from hazardQuestions`);
              break;
            }
          }
          
          if (!categoriesSource) {
            console.log('No hazard categories found in hazardQuestions');
          }
        }
        
        if (categoriesSource) {
          console.log('Categories source type:', typeof categoriesSource);
          console.log('Categories source value:', categoriesSource);
          
          if (Array.isArray(categoriesSource)) {
            hazardCategories.push(...categoriesSource);
            console.log('Parsed as array:', categoriesSource);
          } else if (typeof categoriesSource === 'string') {
            try {
              const parsed = JSON.parse(categoriesSource);
              hazardCategories.push(...parsed);
              console.log('Parsed from string:', parsed);
            } catch (error) {
              console.error('Failed to parse categories source:', error);
              // Fallback: try to parse as single string
              hazardCategories.push(categoriesSource);
            }
          } else {
            console.log('Unexpected type for categories source:', typeof categoriesSource);
            // Fallback: treat as single category
            hazardCategories.push(String(categoriesSource));
          }
        } else {
          console.log('No hazard categories found in project data');
        }
        
        // Фильтрация пустых значений и исключение категории "Другие"
        const filteredCategories = hazardCategories.filter(cat => cat && cat.trim() && cat.trim() !== 'Другие');
        
        setSelectedHazardCategories(filteredCategories);
        console.log('Final hazardCategories array:', filteredCategories);
        console.log('Full project data:', projectData);
        console.log('=== END LOADING PROJECT DATA ===');
        
        // Set default lifecycle stage and hazard category for new risk
        if (stages.length > 0) {
          setNewRisk(prev => ({
            ...prev, 
            lifecycleStage: stages[0],
            hazardCategory: hazardCategories.length > 0 ? hazardCategories[0] : ''
          }));
        }
      }
      
      // Load risk factors
      const risksResponse = await fetch(`${API_BASE_URL}/api/risk-analyses/project/${id}/factors`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (risksResponse.ok) {
        const risksData = await risksResponse.json();
        
        const transformedRisks = risksData.map(risk => {
          // Извлекаем текстовое название категории из hazard_name (формат: "[Категория] Название")
          let textualHazardCategory = risk.hazard_category; // fallback to enum
          let cleanHazardName = risk.hazard_name;
          
          const categoryMatch = risk.hazard_name.match(/^\[(.+?)\]\s*(.*)$/);
          if (categoryMatch) {
            textualHazardCategory = categoryMatch[1]; // Текстовое название категории
            cleanHazardName = categoryMatch[2]; // Название риска без префикса
          }
          
          return {
            id: risk.id,
            lifecycleStage: risk.lifecycle_stage,
            hazardName: cleanHazardName, // Без префикса категории
            hazardousS: risk.hazardous_situation,
            sequenceOfEvents: risk.sequence_of_events,
            harm: risk.harm,
            hazardCategory: textualHazardCategory, // Теперь это текстовое название!
            severityScore: risk.severity_score,
            probabilityScore: risk.probability_score,
            riskScore: risk.risk_score,
            controlMeasures: risk.control_measures || '',
            status: 'identified', // Default status for now
            lastUpdated: risk.updated_at || risk.created_at,
            risk_status: risk.risk_status || 'new' // Статус риска для матрицы
          };
        });
        
        setRisks(transformedRisks);
      } else {
        setRisks([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setRisks([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRisks = () => {
    let filtered = risks;
    
    // Специалист видит только риски назначенных этапов жизненного цикла
    if (userProjectRole === 'specialist') {
      filtered = filtered.filter(risk => assignedLifecycleStages.includes(risk.lifecycleStage));
    }
    
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(risk => {
        if (!risk.riskScore) return false;
        return getRiskLevel(risk.riskScore).level === filterSeverity;
      });
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(risk => risk.hazardCategory === filterCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(risk => 
        risk.hazardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.hazardousS.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.harm.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredRisks(filtered);
  };

  const getRiskLevel = (score) => {
    const threshold = Number(riskThreshold) || 10;
    if (score >= threshold) return { level: 'high', color: '#FF4444' };
    return { level: 'low', color: '#00AA44' };
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      identified: { label: 'Identified', className: 'status-identified' },
      under_review: { label: 'Under Review', className: 'status-review' },
      mitigated: { label: 'Mitigated', className: 'status-mitigated' }
    };
    
    const config = statusConfig[status] || statusConfig.identified;
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  /**
   * Вычисляет матрицу покрытия рисков: какие комбинации "жизненный цикл × опасность" уже покрыты
   * @returns {Object} coverage - объект с информацией о покрытии
   */
  const calculateCoverageMatrix = () => {
    if (!lifecycleStages.length || !selectedHazardCategories.length) {
      return {
        totalRequired: 0,
        totalCovered: 0,
        missingCombinations: [],
        matrix: {},
        coveragePercentage: 100
      };
    }

    const totalRequired = lifecycleStages.length * selectedHazardCategories.length;
    const matrix = {};
    const coveredSet = new Set();
    const missingCombinations = [];

    // Инициализируем матрицу - теперь для каждой комбинации храним статусы
    lifecycleStages.forEach(stage => {
      matrix[stage] = {};
      selectedHazardCategories.forEach(hazard => {
        matrix[stage][hazard] = {
          new: 0,
          evaluated: 0,
          pending_second: 0,
          pending_benefit: 0,
          pending_closure: 0,
          closed: 0,
          fully_closed: 0,
          total: 0
        };
      });
    });

    // Заполняем матрицу на основе существующих рисков
    risks.forEach(risk => {
      if (risk.risk_status !== 'closed' && risk.risk_status !== 'fully_closed') {
        return;
      }
      if (matrix[risk.lifecycleStage] && matrix[risk.lifecycleStage][risk.hazardCategory]) {
        const cell = matrix[risk.lifecycleStage][risk.hazardCategory];
        cell.total++;
        
        // Группируем по статусам
        const status = risk.risk_status || 'new';
        
        if (cell[status] !== undefined) {
          cell[status]++;
        } else {
          cell.new++; // Если статус неизвестен, считаем как new
        }
        
        coveredSet.add(`${risk.lifecycleStage}|||${risk.hazardCategory}`);
      }
    });

    // Находим недостающие комбинации
    lifecycleStages.forEach(stage => {
      selectedHazardCategories.forEach(hazard => {
        if (matrix[stage][hazard].total === 0) {
          missingCombinations.push({ stage, hazard });
        }
      });
    });

    const totalCovered = coveredSet.size;
    const coveragePercentage = totalRequired > 0 ? Math.round((totalCovered / totalRequired) * 100) : 100;

    return {
      totalRequired,
      totalCovered,
      missingCombinations,
      matrix,
      coveragePercentage
    };
  };

  const handleAddRisk = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // First, get or create risk analysis for the project
      const analysisResponse = await fetch(`${API_BASE_URL}/api/risk-analyses/project/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      let analysisId;
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        analysisId = analysisData.id;
      } else {
        // Create new risk analysis if it doesn't exist
        const createAnalysisResponse = await fetch(`${API_BASE_URL}/api/risk-analyses/project/${id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            has_body_contact: false,
            contact_type: 'no_contact',
            risk_factors: []
          })
        });
        
        if (createAnalysisResponse.ok) {
          const newAnalysisData = await createAnalysisResponse.json();
          analysisId = newAnalysisData.id;
        } else {
          throw new Error('Failed to create risk analysis');
        }
      }
      
      // Определяем категорию для backend (требуется enum: biological_chemical, operational_informational, software, energy_functional)
      // Мапим выбранную категорию в соответствующий enum
      const finalHazardCategory = newRisk.hazardCategory;
      
      // Мапинг категорий на enum для backend
      const categoryToEnumMap = {
        'Опасности, связанные с биосовместимостью': 'biological_chemical',
        'Опасности, связанные с безопасностью данных и систем': 'software',
        'Опасности, связанные с электричеством': 'energy_functional',
        'Опасности, связанные с движущимися частями': 'operational_informational',
        'Опасности, связанные с излучением': 'energy_functional',
        'Опасности, связанные с удобством использования (usability)': 'operational_informational',
        'Опасности, связанные с микробиологическими факторами': 'biological_chemical',
        'Опасности, связанные с химическими веществами': 'biological_chemical',
        'Опасности, связанные с тканями животного происхождения': 'biological_chemical',
        'Опасности, связанные с наноматериалами': 'biological_chemical',
        'Опасности, связанные с фармацевтическими субстанциями': 'biological_chemical',
        'Опасности, связанные с воздействием окружающей среды': 'operational_informational',
        'Опасности, связанные с механическими факторами, физические': 'operational_informational',
        'Опасности, связанные с термическими воздействиями': 'operational_informational',
        'Опасности, связанные с надежностью, отказом конструкции или функций изделия': 'operational_informational',
        'Опасности клинического применения': 'operational_informational',
        'Другие': 'operational_informational'
      };
      
      const backendHazardCategory = categoryToEnumMap[newRisk.hazardCategory] || 'operational_informational';
      
      // Add risk factor (scores and control measures will be set in risk table)
      // Сохраняем название категории в hazard_name с префиксом
      const riskFactorData = {
        lifecycle_stage: newRisk.lifecycleStage,
        hazard_name: `[${finalHazardCategory}] ${newRisk.hazardName}`,
        hazardous_situation: newRisk.hazardousS,
        sequence_of_events: newRisk.sequenceOfEvents,
        harm: newRisk.harm,
        hazard_category: backendHazardCategory
        // severity_score, probability_score, control_measures are now optional
      };
      
      const addRiskResponse = await fetch(`${API_BASE_URL}/api/risk-analyses/${analysisId}/factors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(riskFactorData)
      });
      
      if (addRiskResponse.ok) {
        const responseData = await addRiskResponse.json();
        console.log('Risk created successfully:', responseData);
        
        // Reload risks and wait for completion
        await loadProjectAndRisks();
        
        setNewRisk({
          lifecycleStage: lifecycleStages.length > 0 ? lifecycleStages[0] : '',
          hazardName: '',
          hazardousS: '',
          sequenceOfEvents: '',
          harm: '',
          hazardCategory: selectedHazardCategories.length > 0 ? selectedHazardCategories[0] : ''
        });
        setShowAddRisk(false);
        
        // Show success message
        alert('Risk added successfully! Coverage matrix updated.');
      } else {
        const errorData = await addRiskResponse.text();
        console.error('Failed to add risk factor:', errorData);
        alert('Failed to add risk. Please try again.');
      }
    } catch (error) {
      console.error('Failed to add risk:', error);
      alert('An error occurred while adding the risk. Please try again.');
    }
  };

  const handleEditRisk = async (e) => {
    e.preventDefault();
    if (!selectedRisk) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Мапинг категорий на enum для backend (как в handleAddRisk)
      const categoryToEnumMap = {
        'Опасности, связанные с биосовместимостью': 'biological_chemical',
        'Опасности, связанные с безопасностью данных и систем': 'software',
        'Опасности, связанные с электричеством': 'energy_functional',
        'Опасности, связанные с движущимися частями': 'operational_informational',
        'Опасности, связанные с излучением': 'energy_functional',
        'Опасности, связанные с удобством использования (usability)': 'operational_informational',
        'Опасности, связанные с микробиологическими факторами': 'biological_chemical',
        'Опасности, связанные с химическими веществами': 'biological_chemical',
        'Опасности, связанные с тканями животного происхождения': 'biological_chemical',
        'Опасности, связанные с наноматериалами': 'biological_chemical',
        'Опасности, связанные с фармацевтическими субстанциями': 'biological_chemical',
        'Опасности, связанные с воздействием окружающей среды': 'operational_informational',
        'Опасности, связанные с механическими факторами, физические': 'operational_informational',
        'Опасности, связанные с термическими воздействиями': 'operational_informational',
        'Опасности, связанные с надежностью, отказом конструкции или функций изделия': 'operational_informational',
        'Опасности клинического применения': 'operational_informational',
        'Другие': 'operational_informational'
      };
      
      const backendHazardCategory = categoryToEnumMap[selectedRisk.hazardCategory] || 'operational_informational';
      
      // Update risk factor (scores and control measures are managed in risk table)
      // Сохраняем текстовое название категории в hazard_name с префиксом
      const riskFactorData = {
        lifecycle_stage: selectedRisk.lifecycleStage,
        hazard_name: `[${selectedRisk.hazardCategory}] ${selectedRisk.hazardName}`,
        hazardous_situation: selectedRisk.hazardousS,
        sequence_of_events: selectedRisk.sequenceOfEvents,
        harm: selectedRisk.harm,
        hazard_category: backendHazardCategory
        // severity_score, probability_score, control_measures are optional
      };
      
      const updateRiskResponse = await fetch(`${API_BASE_URL}/api/risk-analyses/factors/${selectedRisk.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(riskFactorData)
      });
      
      if (updateRiskResponse.ok) {
        const responseData = await updateRiskResponse.json();
        console.log('Risk updated successfully:', responseData);
        
        // Reload risks and wait for completion
        await loadProjectAndRisks();
        setShowEditRisk(false);
        setSelectedRisk(null);
        
        // Show success message
        alert('Risk updated successfully! Coverage matrix updated.');
      } else {
        const errorData = await updateRiskResponse.text();
        console.error('Failed to update risk factor:', errorData);
        alert('Failed to update risk. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update risk:', error);
      alert('An error occurred while updating the risk. Please try again.');
    }
  };

  const handleDeleteRisk = async (riskId) => {
    if (!confirm('Are you sure you want to delete this risk?')) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const deleteRiskResponse = await fetch(`${API_BASE_URL}/api/risk-analyses/factors/${riskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (deleteRiskResponse.ok) {
        const responseData = await deleteRiskResponse.json();
        console.log('Risk deleted successfully:', responseData);
        
        // Reload risks and wait for completion
        await loadProjectAndRisks();
        
        // Show success message
        alert('Risk deleted successfully! Coverage matrix updated.');
      } else {
        const errorData = await deleteRiskResponse.text();
        console.error('Failed to delete risk factor:', errorData);
        alert('Failed to delete risk. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete risk:', error);
      alert('An error occurred while deleting the risk. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="risk-analysis">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading risk analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="risk-analysis">
      {/* Header */}
      <div className="analysis-header">
        <div className="header-content">
          <h1>Risk Analysis</h1>
          <p>Project: {project?.name}</p>
        </div>
        <div className="header-actions">
          <Link to={`/project/${id}`} className="btn btn-secondary">
            Back to Project
          </Link>
          {canOpenRiskTable() && (
            <button
              className="btn btn-info"
              onClick={() => {
                // Открываем таблицу управления рисками с первым листом
                navigate(`/project/${id}?openRiskTable=true&sheet=first`);
              }}
            >
              Risk Management Table
            </button>
          )}
          {canAddRisks() && (
            <button
              className="btn btn-primary"
              onClick={() => setShowAddRisk(true)}
            >
              + Add Risk
            </button>
          )}
        </div>
      </div>

      {/* Risk Summary */}
      <div className="risk-summary">
        <div className="summary-card">
          <div className="summary-number">{risks.length}</div>
          <div className="summary-label">Total Risks</div>
        </div>
        <div className="summary-card high-risk">
          <div className="summary-number">
            {risks.filter(r => r.riskScore && getRiskLevel(r.riskScore).level === 'high').length}
          </div>
          <div className="summary-label">High Risk</div>
        </div>
        <div className="summary-card low-risk">
          <div className="summary-number">
            {risks.filter(r => r.riskScore && getRiskLevel(r.riskScore).level === 'low').length}
          </div>
          <div className="summary-label">Low Risk</div>
        </div>
        <div className="summary-card" style={{ backgroundColor: '#f5f5f5' }}>
          <div className="summary-number">
            {risks.filter(r => !r.riskScore).length}
          </div>
          <div className="summary-label">Not Evaluated</div>
        </div>
      </div>

      {/* Coverage Matrix - показывает полноту покрытия рисков */}
      {lifecycleStages.length > 0 && selectedHazardCategories.length > 0 && (() => {
        const coverage = calculateCoverageMatrix();
        return (
          <div className="coverage-matrix-section">
            <div className="coverage-header">
              <h2>Risk Coverage Matrix</h2>
              <div className="coverage-stats">
                <span className={`coverage-badge ${coverage.coveragePercentage === 100 ? 'complete' : coverage.coveragePercentage >= 50 ? 'partial' : 'low'}`}>
                  {coverage.coveragePercentage}% Complete
                </span>
                <span className="coverage-info">
                  {coverage.totalCovered} / {coverage.totalRequired} combinations covered
                </span>
              </div>
            </div>


            <div className="coverage-matrix-container">
              <table className="coverage-matrix-table">
                <thead>
                  <tr>
                    <th className="matrix-corner">Lifecycle Stage / Hazard</th>
                    {selectedHazardCategories.map((hazard, idx) => (
                      <th key={idx} className="matrix-hazard-header">
                        <div className="hazard-header-content" title={hazard}>
                          {hazard.length > 30 ? hazard.substring(0, 30) + '...' : hazard}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lifecycleStages.map((stage, stageIdx) => (
                    <tr key={stageIdx}>
                      <td className="matrix-stage-header" title={stage}>
                        {stage}
                      </td>
                      {selectedHazardCategories.map((hazard, hazardIdx) => {
                        const cellData = coverage.matrix[stage]?.[hazard] || { total: 0 };
                        const isCovered = cellData.total > 0;
                        
                        return (
                          <td 
                            key={hazardIdx} 
                            className={`matrix-cell ${isCovered ? 'covered' : 'missing'}`}
                            title={isCovered ? 
                              `Total: ${cellData.total} | New: ${cellData.new} | In work: ${cellData.evaluated} | Pending second: ${cellData.pending_second} | Pending analysis: ${cellData.pending_benefit} | Pending closure: ${cellData.pending_closure} | Closed: ${cellData.closed} | Fully closed: ${cellData.fully_closed}` 
                              : 'No risks yet'}
                          >
                            {isCovered ? (
                              <div className="cell-status-badges">
                                {cellData.new > 0 && (
                                  <span className="status-badge status-new">
                                    ⚪{cellData.new}
                                  </span>
                                )}
                                {cellData.evaluated > 0 && (
                                  <span className="status-badge status-evaluated">
                                    🟡{cellData.evaluated}
                                  </span>
                                )}
                                {cellData.pending_second > 0 && (
                                  <span className="status-badge status-pending">
                                    🟠{cellData.pending_second}
                                  </span>
                                )}
                                {cellData.pending_benefit > 0 && (
                                  <span className="status-badge status-pending">
                                    🟠{cellData.pending_benefit}
                                  </span>
                                )}
                                {cellData.pending_closure > 0 && (
                                  <span className="status-badge status-pending">
                                    🟠{cellData.pending_closure}
                                  </span>
                                )}
                                {cellData.closed > 0 && (
                                  <span className="status-badge status-closed">
                                    🟢{cellData.closed}
                                  </span>
                                )}
                                {cellData.fully_closed > 0 && (
                                  <span className="status-badge status-closed">
                                    🟢{cellData.fully_closed}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="cell-empty">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {coverage.coveragePercentage === 100 && (
              <div className="coverage-complete-message">
                ✅ All lifecycle stage × hazard combinations are covered!
              </div>
            )}
          </div>
        );
      })()}

      {/* Filters and Controls */}
      <div className="analysis-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search risks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="low">Low Risk</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="biological_chemical">Biological/Chemical</option>
            <option value="operational_informational">Operational/Informational</option>
            <option value="software">Software</option>
            <option value="energy_functional">Energy/Functional</option>
          </select>
        </div>
      </div>



      {/* Risk Table */}
      <div className="risk-table-container">
        <table className="risk-table">
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>Status</th>
              <th>Category</th>
              <th>Lifecycle Stage</th>
              <th>Hazard</th>
              <th>Sequence of Events</th>
              <th>Hazardous Situation</th>
              <th>Harm</th>
              <th>Risk Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRisks.map(risk => {
              const riskLevel = risk.riskScore ? getRiskLevel(risk.riskScore) : { level: 'unknown', color: '#9E9E9E' };
              
              // Определяем статус риска
              const getRiskStatusIcon = (status) => {
                switch(status) {
                  case 'closed': return { icon: '🟢', title: 'Closed' };
                  case 'fully_closed': return { icon: '🟢', title: 'Fully Closed' };
                  case 'pending_closure': return { icon: '🟠', title: 'Pending Closure' };
                  case 'pending_benefit': return { icon: '🟠', title: 'Pending Risk/Benefit Analysis' };
                  case 'pending_second': return { icon: '🟠', title: 'Pending Second Evaluation' };
                  case 'evaluated': return { icon: '🟡', title: 'In Work' };
                  case 'new': return { icon: '⚪', title: 'New' };
                  default: return { icon: '⚪', title: 'New' };
                }
              };
              
              const statusInfo = getRiskStatusIcon(risk.risk_status);
              
              return (
                <tr key={risk.id} className="risk-row">
                  <td className="status-cell" style={{ textAlign: 'center' }}>
                    <span 
                      className="risk-status-icon"
                      title={statusInfo.title}
                      style={{ fontSize: '18px', cursor: 'help' }}
                    >
                      {statusInfo.icon}
                    </span>
                  </td>
                  <td className="category-cell">
                    {risk.hazardCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </td>
                  <td className="lifecycle-cell">
                    {risk.lifecycleStage}
                  </td>
                  <td className="hazard-cell">
                    {risk.hazardName}
                  </td>
                  <td className="sequence-cell">
                    {risk.sequenceOfEvents}
                  </td>
                  <td className="situation-cell">
                    {risk.hazardousS}
                  </td>
                  <td className="harm-cell">
                    {risk.harm}
                  </td>
                  <td className="risk-score-cell">
                    {risk.riskScore ? (
                      <span 
                        className={`risk-score ${riskLevel.level}`}
                        style={{ backgroundColor: riskLevel.color }}
                      >
                        {risk.riskScore}
                      </span>
                    ) : (
                      <span className="not-evaluated" style={{ color: '#999', fontStyle: 'italic' }}>
                        Not evaluated
                      </span>
                    )}
                  </td>
                  <td className="actions-cell">
                    {canEditRisks() && (
                      <button 
                        className="action-btn edit"
                        onClick={() => {
                          setSelectedRisk(risk);
                          setShowEditRisk(true);
                        }}
                        title="Edit risk"
                      >
                        ✏️
                      </button>
                    )}
                    {canDeleteRisks() && (
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteRisk(risk.id)}
                        title="Delete risk"
                      >
                        🗑️
                      </button>
                    )}
                    {canOpenRiskTable() && (
                      <button
                        className="action-btn view"
                        onClick={() => {
                          // Используем lifecycleStage напрямую как sheetId (динамические этапы жизненного цикла)
                          const sheetId = risk.lifecycleStage;

                          sessionStorage.setItem('highlightRiskId', risk.id);
                          sessionStorage.setItem('openSheet', sheetId);

                          navigate(`/project/${id}?openRiskTable=true&sheet=${sheetId}&riskId=${risk.id}`);
                        }}
                        title="Open in Risk Table"
                      >
                        📊
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Risk Modal */}
      {showAddRisk && (
        <div className="modal-overlay" onClick={() => setShowAddRisk(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Risk</h2>
              <button 
                className="close-btn"
                onClick={() => setShowAddRisk(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddRisk} className="risk-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Категория опасности (из чеклиста проекта)</label>
                  <select
                    value={newRisk.hazardCategory}
                    onChange={(e) => {
                      setNewRisk({
                        ...newRisk, 
                        hazardCategory: e.target.value
                      });
                    }}
                    required
                  >
                    {selectedHazardCategories.length === 0 && (
                      <option value="">Категории опасностей не выбраны в проекте</option>
                    )}
                    {selectedHazardCategories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Lifecycle Stage</label>
                  <select
                    value={newRisk.lifecycleStage}
                    onChange={(e) => setNewRisk({...newRisk, lifecycleStage: e.target.value})}
                    required
                    disabled={userProjectRole === 'specialist' && assignedLifecycleStages.length <= 1}
                  >
                    {userProjectRole === 'specialist' ? (
                      assignedLifecycleStages.length > 0 ? (
                        assignedLifecycleStages.map(stage => (
                          <option key={stage} value={stage}>
                            {stage.charAt(0).toUpperCase() + stage.slice(1)}
                          </option>
                        ))
                      ) : (
                        <option value="">Нет назначенных этапов ЖЦ</option>
                      )
                    ) : (
                      lifecycleStages.map(stage => (
                        <option key={stage} value={stage}>
                          {stage.charAt(0).toUpperCase() + stage.slice(1)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Hazard Name</label>
                <input
                  type="text"
                  value={newRisk.hazardName}
                  onChange={(e) => setNewRisk({...newRisk, hazardName: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Sequence of Events</label>
                <textarea
                  value={newRisk.sequenceOfEvents}
                  onChange={(e) => setNewRisk({...newRisk, sequenceOfEvents: e.target.value})}
                  rows="2"
                  required
                />
              </div>

              <div className="form-group">
                <label>Hazardous Situation</label>
                <textarea
                  value={newRisk.hazardousS}
                  onChange={(e) => setNewRisk({...newRisk, hazardousS: e.target.value})}
                  rows="2"
                  required
                />
              </div>

              <div className="form-group">
                <label>Harm</label>
                <textarea
                  value={newRisk.harm}
                  onChange={(e) => setNewRisk({...newRisk, harm: e.target.value})}
                  rows="2"
                  required
                />
              </div>

              {/* Severity, Probability scores and Control Measures are now managed in the Risk Management Table */}
              <div className="info-message" style={{ 
                backgroundColor: '#E3F2FD', 
                padding: '12px', 
                borderRadius: '4px', 
                marginTop: '12px',
                fontSize: '14px',
                color: '#1976D2'
              }}>
                ℹ️ <strong>Note:</strong> Risk scores and control measures will be filled in the Risk Management Table after creating the risk.
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRisk(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Risk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Risk Modal */}
      {showEditRisk && selectedRisk && (
        <div className="modal-overlay" onClick={() => setShowEditRisk(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Risk</h2>
              <button 
                className="close-btn"
                onClick={() => setShowEditRisk(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleEditRisk} className="risk-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Категория опасности (из чеклиста проекта)</label>
                  <select
                    value={selectedRisk.hazardCategory}
                    onChange={(e) => setSelectedRisk({...selectedRisk, hazardCategory: e.target.value})}
                    required
                  >
                    {selectedHazardCategories.length === 0 && (
                      <option value="">Категории опасностей не выбраны в проекте</option>
                    )}
                    {selectedHazardCategories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Lifecycle Stage</label>
                  <select
                    value={selectedRisk.lifecycleStage}
                    onChange={(e) => setSelectedRisk({...selectedRisk, lifecycleStage: e.target.value})}
                    required
                  >
                    {lifecycleStages.map(stage => (
                      <option key={stage} value={stage}>
                        {stage.charAt(0).toUpperCase() + stage.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Hazard Name</label>
                <input
                  type="text"
                  value={selectedRisk.hazardName}
                  onChange={(e) => setSelectedRisk({...selectedRisk, hazardName: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Sequence of Events</label>
                <textarea
                  value={selectedRisk.sequenceOfEvents}
                  onChange={(e) => setSelectedRisk({...selectedRisk, sequenceOfEvents: e.target.value})}
                  rows="2"
                  required
                />
              </div>

              <div className="form-group">
                <label>Hazardous Situation</label>
                <textarea
                  value={selectedRisk.hazardousS}
                  onChange={(e) => setSelectedRisk({...selectedRisk, hazardousS: e.target.value})}
                  rows="2"
                  required
                />
              </div>

              <div className="form-group">
                <label>Harm</label>
                <textarea
                  value={selectedRisk.harm}
                  onChange={(e) => setSelectedRisk({...selectedRisk, harm: e.target.value})}
                  rows="2"
                  required
                />
              </div>

              {/* Severity, Probability scores and Control Measures are now managed in the Risk Management Table */}
              <div className="info-message" style={{ 
                backgroundColor: '#E3F2FD', 
                padding: '12px', 
                borderRadius: '4px', 
                marginTop: '12px',
                fontSize: '14px',
                color: '#1976D2'
              }}>
                ℹ️ <strong>Note:</strong> Risk scores and control measures are managed in the Risk Management Table.
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditRisk(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Risk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Risk Modal */}
      {showViewRisk && selectedRisk && (
        <div className="modal-overlay" onClick={() => setShowViewRisk(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>View Risk Details</h2>
              <button 
                className="close-btn"
                onClick={() => setShowViewRisk(false)}
              >
                ×
              </button>
            </div>
            
            <div className="risk-details">
              <div className="detail-row">
                <label>Hazard Category:</label>
                <span>{selectedRisk.hazardCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
              <div className="detail-row">
                <label>Lifecycle Stage:</label>
                <span>{selectedRisk.lifecycleStage}</span>
              </div>
              <div className="detail-row">
                <label>Hazard Name:</label>
                <span>{selectedRisk.hazardName}</span>
              </div>
              <div className="detail-row">
                <label>Sequence of Events:</label>
                <span>{selectedRisk.sequenceOfEvents}</span>
              </div>
              <div className="detail-row">
                <label>Hazardous Situation:</label>
                <span>{selectedRisk.hazardousS}</span>
              </div>
              <div className="detail-row">
                <label>Harm:</label>
                <span>{selectedRisk.harm}</span>
              </div>
              
              {/* Show scores if available from risk table */}
              {selectedRisk.severityScore && (
                <div className="detail-row">
                  <label>Severity Score (from Risk Table):</label>
                  <span>{selectedRisk.severityScore}</span>
                </div>
              )}
              {selectedRisk.probabilityScore && (
                <div className="detail-row">
                  <label>Probability Score (from Risk Table):</label>
                  <span>{selectedRisk.probabilityScore}</span>
                </div>
              )}
              {selectedRisk.riskScore && (
                <div className="detail-row">
                  <label>Risk Score (from Risk Table):</label>
                  <span className={`risk-score ${getRiskLevel(selectedRisk.riskScore).level}`}>
                    {selectedRisk.riskScore}
                  </span>
                </div>
              )}
              
              {!selectedRisk.severityScore && !selectedRisk.probabilityScore && (
                <div className="info-message" style={{ 
                  backgroundColor: '#FFF3E0', 
                  padding: '12px', 
                  borderRadius: '4px', 
                  marginTop: '8px',
                  fontSize: '14px',
                  color: '#E65100'
                }}>
                  ⚠️ Risk scores not yet assigned. Please evaluate this risk in the Risk Management Table.
                </div>
              )}
              <div className="detail-row">
                <label>Last Updated:</label>
                <span>{new Date(selectedRisk.lastUpdated).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="modal-actions">
              {canOpenRiskTable() && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    // Используем lifecycleStage напрямую как sheetId (динамические этапы жизненного цикла)
                    const sheetId = selectedRisk.lifecycleStage;

                    // Сохраняем информацию о том, какой риск нужно подсветить
                    sessionStorage.setItem('highlightRiskId', selectedRisk.id);
                    sessionStorage.setItem('openSheet', sheetId);

                    // Перенаправляем на страницу проекта с флагом открытия таблицы
                    navigate(`/project/${id}?openRiskTable=true&sheet=${sheetId}&riskId=${selectedRisk.id}`);
                  }}
                >
                  📊 Open in Risk Table
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setShowViewRisk(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating return button like Personal Account (hidden when any modal is open) */}
      {!showAddRisk && !showEditRisk && !showViewRisk && (
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
      )}
    </div>
  );
};

export default RiskAnalysis;
