import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProjectForm.css';

const ProjectForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id && id !== 'new');
  
  const [formData, setFormData] = useState({
    // Основная информация о проекте
    name: '',
    description: '',
    status: 'draft',

    // Информация об устройстве
    deviceName: '',
    deviceModel: '',
    devicePurpose: '',
    deviceDescription: '',
    deviceClassification: '',
    intendedUse: '',
    userProfile: '',
    operatingEnvironment: '',

    // Технические характеристики
    technicalSpecs: '',
    regulatoryRequirements: '',
    standards: '',

    // Параметры оценки рисков
    contactType: 'no_contact',
    duration: 'temporary',
    invasiveness: 'non_invasive',
    energySource: 'none',

    // Назначение команды
    projectLead: '',
    teamMembers: [],

    // Этапы жизненного цикла
    lifecycleStages: [],
    customLifecycleStage: '',

    // Вопросы об опасностях и вкладки
    hazardQuestions: {
      active: false,
      sterile: false,
      disposable: false,
      software: false,
      implantable: false,
      // Биосовместимость
      bodyContact: false,
      materialContact: false,
      implantableDevice: false,
      substanceRelease: false,
      sensitization: false,
      // Данные и системы
      containsSoftware: false,
      dataExchange: false,
      wireless: false,
      personalData: false,
      userInterface: false,
      // Электричество
      activeDevice: false,
      powerConnection: false,
      electricalContacts: false,
      // Движущиеся части
      movingElements: false,
      movingRisk: false,
      // Излучение
      emitsEnergy: false,
      opticalSystems: false,
      // Удобство использования
      specialTraining: false,
      specialNeeds: false,
      interfaceError: false,
      alarms: false,
      // Микробиологические факторы
      isSterile: false,
      reusable: false,
      biologicalContact: false,
      // Химические вещества
      chemicalSubstances: false,
      chemicalRelease: false,
      chemicalSterilization: false,
      // Ткани животного происхождения
      animalMaterials: false,
      // Наноматериалы
      nanomaterials: false,
      // Фармацевтические субстанции
      pharmaceutical: false,
      // Воздействие окружающей среды
      environmentalSensitivity: false,
      environmentalImpact: false,
      // Механические факторы
      mechanicalLoad: false,
      destructionRisk: false,
      // Термические воздействия
      heating: false,
      surfaceContact: false,
      // Надежность (всегда активна)
      reliability: true,
      // Клиническое применение
      clinicalUse: false,
      clinicalError: false,
      clinicalValidation: false
    },
    customHazard: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadCurrentUser();
    loadAvailableUsers();
    if (isEditMode) {
      loadProjectData();
    }
  }, [id, isEditMode]);

  const loadCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
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
        // Преобразуем в формат для селекта
        const formattedUsers = usersData
          .filter(user => user.is_active) // Только активные пользователи
          .map(user => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`.trim() || user.email,
            email: user.email,
            role: user.role
          }));
        setAvailableUsers(formattedUsers);
      } else {
        console.error('Failed to load users:', response.status);
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setAvailableUsers([]);
    }
  };

  const loadProjectData = async () => {
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
        
        // Загружаем членов проекта
        const membersResponse = await fetch(`http://localhost:8000/api/projects/${id}/members`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        let projectLead = '';
        let teamMembers = [];

        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          teamMembers = membersData
            .filter(member => member.role !== 'owner')
            .map(member => member.user_id.toString());

          // Устанавливаем руководителя проекта (первый член или владелец)
          const leadMember = membersData.find(member => member.role === 'owner') || membersData[0];
          if (leadMember) {
            projectLead = leadMember.user_id.toString();
          }
        }
        
        setFormData({
          name: projectData.name || '',
          description: projectData.description || '',
          status: projectData.status || 'draft',
          deviceName: projectData.device_name || '',
          deviceModel: projectData.device_model || '',
          devicePurpose: projectData.device_purpose || '',
          deviceDescription: projectData.device_description || '',
          deviceClassification: projectData.device_classification || '',
          intendedUse: projectData.intended_use || '',
          userProfile: projectData.user_profile || '',
          operatingEnvironment: projectData.operating_environment || '',
          technicalSpecs: projectData.technical_specs || '',
          regulatoryRequirements: projectData.regulatory_requirements || '',
          standards: projectData.standards || '',
          contactType: projectData.contact_type || 'no_contact',
          duration: projectData.duration || 'temporary',
          invasiveness: projectData.invasiveness || 'non_invasive',
          energySource: projectData.energy_source || 'none',
          projectLead: projectLead,
          teamMembers: teamMembers,
          lifecycleStages: projectData.lifecycle_stages || [],
          customLifecycleStage: projectData.custom_lifecycle_stage || '',
          hazardQuestions: projectData.hazard_questions || {
            active: false,
            sterile: false,
            disposable: false,
            software: false,
            implantable: false,
            bodyContact: false,
            materialContact: false,
            implantableDevice: false,
            substanceRelease: false,
            sensitization: false,
            containsSoftware: false,
            dataExchange: false,
            wireless: false,
            personalData: false,
            userInterface: false,
            activeDevice: false,
            powerConnection: false,
            electricalContacts: false,
            movingElements: false,
            movingRisk: false,
            emitsEnergy: false,
            opticalSystems: false,
            specialTraining: false,
            specialNeeds: false,
            interfaceError: false,
            alarms: false,
            isSterile: false,
            reusable: false,
            biologicalContact: false,
            chemicalSubstances: false,
            chemicalRelease: false,
            chemicalSterilization: false,
            animalMaterials: false,
            nanomaterials: false,
            pharmaceutical: false,
            environmentalSensitivity: false,
            environmentalImpact: false,
            mechanicalLoad: false,
            destructionRisk: false,
            heating: false,
            surfaceContact: false,
            reliability: true,
            clinicalUse: false,
            clinicalError: false,
            clinicalValidation: false
          },
          customHazard: projectData.custom_hazard || ''
        });
      } else {
        setError('Не удалось загрузить данные проекта');
      }
    } catch (err) {
      setError('Не удалось загрузить данные проекта');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLifecycleCheckboxChange = (e, stage) => {
    const { checked } = e.target;
    setFormData(prev => ({
      ...prev,
      lifecycleStages: checked
        ? [...prev.lifecycleStages, stage]
        : prev.lifecycleStages.filter(s => s !== stage)
    }));
  };

  const handleHazardChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      hazardQuestions: {
        ...prev.hazardQuestions,
        [name]: checked
      }
    }));
  };

  const handleTeamMemberChange = (userId, isSelected) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: isSelected
        ? [...prev.teamMembers, userId]
        : prev.teamMembers.filter(id => id !== userId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Проверка обязательных полей
      if (!formData.name || !formData.deviceName || !formData.devicePurpose) {
        throw new Error('Пожалуйста, заполните все обязательные поля');
      }

      const token = localStorage.getItem('token');
      const url = isEditMode 
        ? `http://localhost:8000/api/projects/${id}`
        : 'http://localhost:8000/api/projects/';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          device_name: formData.deviceName,
          device_model: formData.deviceModel,
          device_purpose: formData.devicePurpose,
          device_description: formData.deviceDescription,
          device_classification: formData.deviceClassification,
          intended_use: formData.intendedUse,
          user_profile: formData.userProfile,
          operating_environment: formData.operatingEnvironment,
          technical_specs: formData.technicalSpecs,
          regulatory_requirements: formData.regulatoryRequirements,
          standards: formData.standards,
          contact_type: formData.contactType,
          duration: formData.duration,
          invasiveness: formData.invasiveness,
          energy_source: formData.energySource,
          status: formData.status,
          lifecycle_stages: formData.lifecycleStages,
          custom_lifecycle_stage: formData.customLifecycleStage,
          hazard_questions: formData.hazardQuestions,
          custom_hazard: formData.customHazard
        })
      });

      if (response.ok) {
        const projectData = await response.json();
        
        if (isEditMode) {
          // Для режима редактирования сначала получаем текущих членов и удаляем тех, кто не выбран
          const currentMembersResponse = await fetch(`http://localhost:8000/api/projects/${id}/members`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (currentMembersResponse.ok) {
            const currentMembers = await currentMembersResponse.json();
            const currentMemberIds = currentMembers
              .filter(member => member.role !== 'owner')
              .map(member => member.user_id.toString());

            // Удаляем членов, которые больше не выбраны
            for (const memberId of currentMemberIds) {
              if (!formData.teamMembers.includes(memberId)) {
                try {
                  await fetch(`http://localhost:8000/api/projects/${id}/members/${memberId}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                } catch (error) {
                  console.error(`Ошибка при удалении пользователя ${memberId} из проекта:`, error);
                }
              }
            }
          }
        }

        // Добавляем новых членов команды
        for (const userId of formData.teamMembers) {
          try {
            const memberResponse = await fetch(`http://localhost:8000/api/projects/${projectData.id}/members`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user_id: userId,
                role: 'member'
              })
            });

            if (!memberResponse.ok) {
              console.warn(`Не удалось добавить пользователя ${userId} в проект`);
            }
          } catch (error) {
            console.error(`Ошибка при добавлении пользователя ${userId} в проект:`, error);
          }
        }
        
        navigate(`/project/${projectData.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Не удалось сохранить проект');
      }

    } catch (err) {
      setError(err.message || 'Не удалось сохранить проект');
    } finally {
      setLoading(false);
    }
  };

  // Все пользователи могут создавать проекты

  // Проверки доступа для редактирования происходят на backend

  if (loading && isEditMode) {
    return (
      <div className="project-form">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Загрузка проекта...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-form">
      <div className="form-header">
        <h1>{isEditMode ? 'Редактировать проект' : 'Создать новый проект'}</h1>
        <p>{isEditMode ? 'Обновить информацию и настройки проекта' : 'Настроить новый проект анализа рисков медицинского устройства'}</p>
      </div>

      <form onSubmit={handleSubmit} className="form">
        {/* Основная информация */}
        <div className="form-section">
          <h2>Основная информация</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Название проекта *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Введите название проекта"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Статус</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="draft">Черновик</option>
                <option value="in_progress">В процессе</option>
                <option value="review">На рассмотрении</option>
                <option value="completed">Завершен</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Описание проекта</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Опишите цели и область проекта"
              rows="3"
            />
          </div>
        </div>

        {/* Информация об устройстве */}
        <div className="form-section">
          <h2>Информация об устройстве</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="deviceName">Название устройства *</label>
              <input
                type="text"
                id="deviceName"
                name="deviceName"
                value={formData.deviceName}
                onChange={handleInputChange}
                placeholder="Введите название устройства"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="deviceModel">Модель устройства</label>
              <input
                type="text"
                id="deviceModel"
                name="deviceModel"
                value={formData.deviceModel}
                onChange={handleInputChange}
                placeholder="Введите номер модели"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="devicePurpose">Назначение устройства *</label>
            <textarea
              id="devicePurpose"
              name="devicePurpose"
              value={formData.devicePurpose}
              onChange={handleInputChange}
              placeholder="Опишите назначение устройства"
              rows="2"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="deviceDescription">Описание устройства</label>
            <textarea
              id="deviceDescription"
              name="deviceDescription"
              value={formData.deviceDescription}
              onChange={handleInputChange}
              placeholder="Предоставьте подробное описание устройства"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="deviceClassification">Классификация устройства</label>
              <select
                id="deviceClassification"
                name="deviceClassification"
                value={formData.deviceClassification}
                onChange={handleInputChange}
              >
                <option value="">Выберите классификацию</option>
                <option value="Class I">Класс I</option>
                <option value="Class IIa">Класс IIa</option>
                <option value="Class IIb">Класс IIb</option>
                <option value="Class III">Класс III</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="intendedUse">Предполагаемое использование</label>
              <input
                type="text"
                id="intendedUse"
                name="intendedUse"
                value={formData.intendedUse}
                onChange={handleInputChange}
                placeholder="Где будет использоваться устройство?"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="userProfile">Профиль пользователя</label>
              <input
                type="text"
                id="userProfile"
                name="userProfile"
                value={formData.userProfile}
                onChange={handleInputChange}
                placeholder="Кто будет использовать устройство?"
              />
            </div>

            <div className="form-group">
              <label htmlFor="operatingEnvironment">Условия эксплуатации</label>
              <input
                type="text"
                id="operatingEnvironment"
                name="operatingEnvironment"
                value={formData.operatingEnvironment}
                onChange={handleInputChange}
                placeholder="Условия окружающей среды"
              />
            </div>
          </div>
        </div>

        {/* Технические характеристики */}
        <div className="form-section">
          <h2>Технические характеристики</h2>

          <div className="form-group">
            <label htmlFor="technicalSpecs">Технические характеристики</label>
            <textarea
              id="technicalSpecs"
              name="technicalSpecs"
              value={formData.technicalSpecs}
              onChange={handleInputChange}
              placeholder="Ключевые технические характеристики и особенности"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="regulatoryRequirements">Нормативные требования</label>
            <textarea
              id="regulatoryRequirements"
              name="regulatoryRequirements"
              value={formData.regulatoryRequirements}
              onChange={handleInputChange}
              placeholder="Применимые нормативные требования (FDA, CE и т.д.)"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label htmlFor="standards">Применимые стандарты</label>
            <textarea
              id="standards"
              name="standards"
              value={formData.standards}
              onChange={handleInputChange}
              placeholder="Соответствующие отраслевые стандарты (ISO, IEC и т.д.)"
              rows="2"
            />
          </div>
        </div>

        {/* Параметры оценки рисков */}
        <div className="form-section">
          <h2>Параметры оценки рисков</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contactType">Тип контакта</label>
              <select
                id="contactType"
                name="contactType"
                value={formData.contactType}
                onChange={handleInputChange}
              >
                <option value="no_contact">Без контакта</option>
                <option value="indirect_contact">Косвенный контакт</option>
                <option value="surface_contact">Поверхностный контакт</option>
                <option value="external_communicating">Внешнее сообщение</option>
                <option value="implantable">Имплантируемое</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="duration">Продолжительность контакта</label>
              <select
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
              >
                <option value="temporary">Временный (≤ 24ч)</option>
                <option value="short_term">Короткий срок (24ч - 30 дней)</option>
                <option value="long_term">Долгий срок (30+ дней)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="invasiveness">Инвазивность</label>
              <select
                id="invasiveness"
                name="invasiveness"
                value={formData.invasiveness}
                onChange={handleInputChange}
              >
                <option value="non_invasive">Неинвазивное</option>
                <option value="invasive">Инвазивное</option>
                <option value="active_implantable">Активное имплантируемое</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="energySource">Источник энергии</label>
              <select
                id="energySource"
                name="energySource"
                value={formData.energySource}
                onChange={handleInputChange}
              >
                <option value="none">Отсутствует</option>
                <option value="electrical">Электрический</option>
                <option value="mechanical">Механический</option>
                <option value="thermal">Тепловой</option>
                <option value="chemical">Химический</option>
                <option value="radioactive">Радиоактивный</option>
              </select>
            </div>
          </div>
        </div>

        {/* Назначение команды */}
        <div className="form-section">
          <h2>Назначение команды</h2>

          <div className="form-group">
            <label htmlFor="projectLead">Руководитель проекта</label>
            <select
              id="projectLead"
              name="projectLead"
              value={formData.projectLead}
              onChange={handleInputChange}
            >
              <option value="">Выберите руководителя проекта</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id.toString()}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Члены команды</label>
            <div className="team-selection">
                {availableUsers.map(user => (
                  <label key={user.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.teamMembers.includes(user.id.toString())}
                      onChange={(e) => handleTeamMemberChange(user.id.toString(), e.target.checked)}
                    />
                    <span>{user.name} ({user.email})</span>
                  </label>
                ))}
              </div>
            </div>
        </div>

        {/* Этапы жизненного цикла */}
        <div className="form-section">
          <h2>Этапы жизненного цикла</h2>
          <p>Выберите этапы жизненного цикла устройства. Это определяет количество вкладок в чек-листе. Всегда включайте "Другие".</p>

          <div className="form-group">
            <label>Этапы жизненного цикла</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="design_development"
                  checked={formData.lifecycleStages.includes('design_development')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'design_development')}
                />
                Проектирование и разработка
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="procurement"
                  checked={formData.lifecycleStages.includes('procurement')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'procurement')}
                />
                Закупка и входной контроль компонентов и материалов
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="production"
                  checked={formData.lifecycleStages.includes('production')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'production')}
                />
                Производство и сборка
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="packaging"
                  checked={formData.lifecycleStages.includes('packaging')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'packaging')}
                />
                Упаковка и маркировка
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="installation"
                  checked={formData.lifecycleStages.includes('installation')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'installation')}
                />
                Монтаж
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="sterilization"
                  checked={formData.lifecycleStages.includes('sterilization')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'sterilization')}
                />
                Стерилизация
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="testing"
                  checked={formData.lifecycleStages.includes('testing')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'testing')}
                />
                Испытания и выпуск продукции
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="storage"
                  checked={formData.lifecycleStages.includes('storage')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'storage')}
                />
                Хранение
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="transportation"
                  checked={formData.lifecycleStages.includes('transportation')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'transportation')}
                />
                Транспортировка и дистрибуция
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="commissioning"
                  checked={formData.lifecycleStages.includes('commissioning')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'commissioning')}
                />
                Установка и ввод в эксплуатацию
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="operation"
                  checked={formData.lifecycleStages.includes('operation')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'operation')}
                />
                Эксплуатация (использование по назначению)
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="maintenance"
                  checked={formData.lifecycleStages.includes('maintenance')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'maintenance')}
                />
                Техническое обслуживание и сервис
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="decommissioning"
                  checked={formData.lifecycleStages.includes('decommissioning')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'decommissioning')}
                />
                Демонтаж и вывод из эксплуатации
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="disposal"
                  checked={formData.lifecycleStages.includes('disposal')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'disposal')}
                />
                Утилизация и уничтожение изделия или его компонентов
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="other"
                  checked={formData.lifecycleStages.includes('other')}
                  onChange={(e) => handleLifecycleCheckboxChange(e, 'other')}
                />
                Другие
              </label>
            </div>
          </div>

          {formData.lifecycleStages.includes('other') && (
            <div className="form-group">
              <label htmlFor="customLifecycleStage">Пользовательский этап жизненного цикла</label>
              <input
                type="text"
                id="customLifecycleStage"
                name="customLifecycleStage"
                value={formData.customLifecycleStage}
                onChange={handleInputChange}
                placeholder="Введите пользовательский этап жизненного цикла"
              />
            </div>
          )}
        </div>

        {/* Оценка опасностей */}
        <div className="form-section">
          <h2>Оценка опасностей</h2>
          <p>Ответьте на следующие вопросы, чтобы определить, какие вкладки опасностей будут доступны. Некоторые вкладки всегда доступны.</p>

          {/* Основные свойства устройства */}
          <div className="form-group">
            <label>Основные свойства устройства</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.hazardQuestions.active}
                  onChange={handleHazardChange}
                />
                Активное
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="sterile"
                  checked={formData.hazardQuestions.sterile}
                  onChange={handleHazardChange}
                />
                Стерильное
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="disposable"
                  checked={formData.hazardQuestions.disposable}
                  onChange={handleHazardChange}
                />
                Одноразовое
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="software"
                  checked={formData.hazardQuestions.software}
                  onChange={handleHazardChange}
                />
                Программное обеспечение входит в состав?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="implantable"
                  checked={formData.hazardQuestions.implantable}
                  onChange={handleHazardChange}
                />
                Предназначено для имплантации?
              </label>
            </div>
          </div>

          {/* Биосовместимость */}
          <div className="form-group">
            <label>Биосовместимость</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="bodyContact"
                  checked={formData.hazardQuestions.bodyContact}
                  onChange={handleHazardChange}
                />
                Имеет ли изделие контакт с телом человека или его жидкостями?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="materialContact"
                  checked={formData.hazardQuestions.materialContact}
                  onChange={handleHazardChange}
                />
                Используются ли материалы с прямым контактом с тканями или жидкостями?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="implantableDevice"
                  checked={formData.hazardQuestions.implantableDevice}
                  onChange={handleHazardChange}
                />
                Предназначено ли изделие для имплантации?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="substanceRelease"
                  checked={formData.hazardQuestions.substanceRelease}
                  onChange={handleHazardChange}
                />
                Есть ли риск выделения веществ из материалов в организм?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="sensitization"
                  checked={formData.hazardQuestions.sensitization}
                  onChange={handleHazardChange}
                />
                Есть ли риск сенсибилизации, раздражения или цитотоксичности?
              </label>
            </div>
          </div>

          {/* Данные и системы */}
          <div className="form-group">
            <label>Данные и системы</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="containsSoftware"
                  checked={formData.hazardQuestions.containsSoftware}
                  onChange={handleHazardChange}
                />
                Содержит ли изделие программное обеспечение?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="dataExchange"
                  checked={formData.hazardQuestions.dataExchange}
                  onChange={handleHazardChange}
                />
                Обменивается ли изделие данными с другими устройствами или сетями?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="wireless"
                  checked={formData.hazardQuestions.wireless}
                  onChange={handleHazardChange}
                />
                Передаёт ли изделие информацию по беспроводной связи (Wi-Fi, Bluetooth)?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="personalData"
                  checked={formData.hazardQuestions.personalData}
                  onChange={handleHazardChange}
                />
                Хранит ли изделие персональные или медицинские данные?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="userInterface"
                  checked={formData.hazardQuestions.userInterface}
                  onChange={handleHazardChange}
                />
                Управляется ли изделие через интерфейс пользователя или сеть?
              </label>
            </div>
          </div>

          {/* Электричество */}
          <div className="form-group">
            <label>Электричество</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="activeDevice"
                  checked={formData.hazardQuestions.activeDevice}
                  onChange={handleHazardChange}
                />
                Является ли изделие активным (использует источник энергии)?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="powerConnection"
                  checked={formData.hazardQuestions.powerConnection}
                  onChange={handleHazardChange}
                />
                Подключается ли изделие к электросети или батарее?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="electricalContacts"
                  checked={formData.hazardQuestions.electricalContacts}
                  onChange={handleHazardChange}
                />
                Есть ли электрические контакты, которые могут соприкасаться с пользователем или пациентом?
              </label>
            </div>
          </div>

          {/* Движущиеся части */}
          <div className="form-group">
            <label>Движущиеся части</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="movingElements"
                  checked={formData.hazardQuestions.movingElements}
                  onChange={handleHazardChange}
                />
                Содержит ли изделие движущиеся механические элементы?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="movingRisk"
                  checked={formData.hazardQuestions.movingRisk}
                  onChange={handleHazardChange}
                />
                Есть ли подвижные узлы, создающие риск защемления, раздавливания или травмы?
              </label>
            </div>
          </div>

          {/* Излучение */}
          <div className="form-group">
            <label>Излучение</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="emitsEnergy"
                  checked={formData.hazardQuestions.emitsEnergy}
                  onChange={handleHazardChange}
                />
                Излучает ли изделие энергию (ультразвук, инфракрасное, УФ, радиацию, лазер)?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="opticalSystems"
                  checked={formData.hazardQuestions.opticalSystems}
                  onChange={handleHazardChange}
                />
                Использует ли изделие световые или оптические системы высокой интенсивности?
              </label>
            </div>
          </div>

          {/* Удобство использования */}
          <div className="form-group">
            <label>Удобство использования</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="specialTraining"
                  checked={formData.hazardQuestions.specialTraining}
                  onChange={handleHazardChange}
                />
                Требуется ли специальное обучение для безопасного применения?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="specialNeeds"
                  checked={formData.hazardQuestions.specialNeeds}
                  onChange={handleHazardChange}
                />
                Предусмотрено ли применение лицами с особыми потребностями?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="interfaceError"
                  checked={formData.hazardQuestions.interfaceError}
                  onChange={handleHazardChange}
                />
                Есть ли риск неправильного выбора режима или ошибки интерфейса?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="alarms"
                  checked={formData.hazardQuestions.alarms}
                  onChange={handleHazardChange}
                />
                Отображает ли изделие сигналы тревоги или предупреждения?
              </label>
            </div>
          </div>

          {/* Микробиологические факторы */}
          <div className="form-group">
            <label>Микробиологические факторы</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isSterile"
                  checked={formData.hazardQuestions.isSterile}
                  onChange={handleHazardChange}
                />
                Изделие является стерильным?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="reusable"
                  checked={formData.hazardQuestions.reusable}
                  onChange={handleHazardChange}
                />
                Изделие многоразовое (повторная очистка и дезинфекция)?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="biologicalContact"
                  checked={formData.hazardQuestions.biologicalContact}
                  onChange={handleHazardChange}
                />
                Имеет ли изделие контакт с биологическими жидкостями?
              </label>
            </div>
          </div>

          {/* Химические вещества */}
          <div className="form-group">
            <label>Химические вещества</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="chemicalSubstances"
                  checked={formData.hazardQuestions.chemicalSubstances}
                  onChange={handleHazardChange}
                />
                Содержит ли изделие химически активные вещества или реагенты?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="chemicalRelease"
                  checked={formData.hazardQuestions.chemicalRelease}
                  onChange={handleHazardChange}
                />
                Возможен ли выброс, испарение или утечка химических веществ при эксплуатации?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="chemicalSterilization"
                  checked={formData.hazardQuestions.chemicalSterilization}
                  onChange={handleHazardChange}
                />
                Требует ли изделие стерилизации химическими агентами?
              </label>
            </div>
          </div>

          {/* Ткани животного происхождения */}
          <div className="form-group">
            <label>Ткани животного происхождения</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="animalMaterials"
                  checked={formData.hazardQuestions.animalMaterials}
                  onChange={handleHazardChange}
                />
                Используются ли материалы или компоненты животного происхождения (коллаген, желатин и т.п.)?
              </label>
            </div>
          </div>

          {/* Наноматериалы */}
          <div className="form-group">
            <label>Наноматериалы</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="nanomaterials"
                  checked={formData.hazardQuestions.nanomaterials}
                  onChange={handleHazardChange}
                />
                Содержит ли изделие наночастицы, нанопокрытия или наноструктуры?
              </label>
            </div>
          </div>

          {/* Фармацевтические субстанции */}
          <div className="form-group">
            <label>Фармацевтические субстанции</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="pharmaceutical"
                  checked={formData.hazardQuestions.pharmaceutical}
                  onChange={handleHazardChange}
                />
                Содержит ли изделие лекарственные вещества или покрытия с высвобождением субстанции?
              </label>
            </div>
          </div>

          {/* Воздействие окружающей среды */}
          <div className="form-group">
            <label>Воздействие окружающей среды</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="environmentalSensitivity"
                  checked={formData.hazardQuestions.environmentalSensitivity}
                  onChange={handleHazardChange}
                />
                Чувствительно ли изделие к температуре, влажности, пыли, вибрации или ЭМИ?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="environmentalImpact"
                  checked={formData.hazardQuestions.environmentalImpact}
                  onChange={handleHazardChange}
                />
                Может ли изделие оказывать влияние на окружающую среду при утилизации?
              </label>
            </div>
          </div>

          {/* Механические факторы */}
          <div className="form-group">
            <label>Механические факторы</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="mechanicalLoad"
                  checked={formData.hazardQuestions.mechanicalLoad}
                  onChange={handleHazardChange}
                />
                Подвержено ли изделие механическим нагрузкам, вибрации, ударам?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="destructionRisk"
                  checked={formData.hazardQuestions.destructionRisk}
                  onChange={handleHazardChange}
                />
                Есть ли риск разрушения, деформации, разгерметизации?
              </label>
            </div>
          </div>

          {/* Термические воздействия */}
          <div className="form-group">
            <label>Термические воздействия</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="heating"
                  checked={formData.hazardQuestions.heating}
                  onChange={handleHazardChange}
                />
                Может ли изделие нагреваться или охлаждаться при использовании?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="surfaceContact"
                  checked={formData.hazardQuestions.surfaceContact}
                  onChange={handleHazardChange}
                />
                Контактирует ли пользователь или пациент с горячими или холодными поверхностями?
              </label>
            </div>
          </div>

          {/* Надежность (всегда активна) */}
          <div className="form-group">
            <label>Надежность (всегда активна)</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="reliability"
                  checked={true}
                  disabled
                />
                Опасности, связанные с надежностью, отказом конструкции или функций изделия
              </label>
            </div>
          </div>

          {/* Клиническое применение */}
          <div className="form-group">
            <label>Клиническое применение</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="clinicalUse"
                  checked={formData.hazardQuestions.clinicalUse}
                  onChange={handleHazardChange}
                />
                Используется ли изделие в диагностике, лечении, реабилитации или мониторинге состояния пациента?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="clinicalError"
                  checked={formData.hazardQuestions.clinicalError}
                  onChange={handleHazardChange}
                />
                Может ли ошибка применения привести к клиническим последствиям?
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="clinicalValidation"
                  checked={formData.hazardQuestions.clinicalValidation}
                  onChange={handleHazardChange}
                />
                Требуется ли клиническая валидация эффективности или безопасности?
              </label>
            </div>
          </div>

          {/* Пользовательская опасность */}
          <div className="form-group">
            <label htmlFor="customHazard">Пользовательская опасность</label>
            <input
              type="text"
              id="customHazard"
              name="customHazard"
              value={formData.customHazard}
              onChange={handleInputChange}
              placeholder="Введите пользовательскую опасность"
            />
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Действия формы */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Сохранение...' : (isEditMode ? 'Обновить проект' : 'Создать проект')}
          </button>
        </div>
      </form>

      {/* Плавающая кнопка возврата наверх */}
      <button
        className={`floating-return visible`}
        onClick={() => {
          const content = document.querySelector('.content-body');
          if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Вернуться наверх"
      >
        ↑
      </button>
    </div>
  );
};

export default ProjectForm;
