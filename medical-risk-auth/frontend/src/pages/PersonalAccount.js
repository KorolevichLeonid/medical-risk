import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import './PersonalAccount.css';

const PersonalAccount = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [projectsCount, setProjectsCount] = useState(0);
  const [activeDays, setActiveDays] = useState('---');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    loadUserData();
    loadProjectsCount();
    loadActiveDays();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();

        const user = {
          id: userData.id,
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          email: userData.email,
          phone: userData.phone || '',
          department: userData.department || '',
          position: userData.position || '',
          role: userData.role,
          avatar: userData.avatar_url || '/api/placeholder/120/120',
          joinDate: userData.created_at,
          lastLogin: userData.last_login,
        };

        setUser(user);
        setFormData({
          firstName: user.firstName,
          lastName: user.lastName,
        });
      } else {
        console.error('Failed to load user data:', response.status);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectsCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const projects = await response.json();
        setProjectsCount(projects.length);
      }
    } catch (error) {
      console.error('Failed to load projects count:', error);
    }
  };

  const loadActiveDays = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        // Рассчитываем активные дни на основе даты создания аккаунта
        if (userData.created_at) {
          const joinDate = new Date(userData.created_at);
          const today = new Date();
          const activeDaysCount = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24));
          setActiveDays(activeDaysCount);
        } else {
          setActiveDays('---');
        }
      }
    } catch (error) {
      console.error('Failed to load active days:', error);
      setActiveDays('---');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        localStorage.setItem('user', JSON.stringify(updatedUser));
        loadUserData();
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        console.error('Failed to update profile:', response.status);
        alert('Error updating profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Server connection error');
    }
  };

  const handleNavigateToProjects = () => {
    navigate('/dashboard');
  };

  const handlePlaceholderAction = () => {
    // Заглушка для остальных навигаций
    console.log('Placeholder action');
  };

  if (loading) {
    return (
      <div className="personal-account">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="personal-account">
      {/* Верхняя секция - Шапка профиля */}
      <div className="profile-header-section">
        <div className="profile-avatar">
          {user.avatar && user.avatar !== '/api/placeholder/50/50' && user.avatar !== '/api/placeholder/40/40' ? (
            <img
              src={user.avatar}
              alt={`${user.firstName} ${user.lastName}`}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="avatar-circle"
            style={{
              display: (!user.avatar || user.avatar === '/api/placeholder/50/50' || user.avatar === '/api/placeholder/40/40') ? 'flex' : 'none',
              backgroundColor: '#8b9dc3',
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '48px',
              fontWeight: '600',
              border: '4px solid #8b9dc3'
            }}
          >
            {user.firstName && user.lastName ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U'}
          </div>
        </div>
        <div className="profile-info-card">
          {!isEditing && (
            <div className="profile-edit-header">
              <button
                className="edit-button"
                onClick={() => setIsEditing(!isEditing)}
                title="Редактировать"
              >
                ✏️
              </button>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="profile-edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">Имя</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Фамилия</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Сохранить
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info-display">
              <div className="profile-name">
                {user.firstName} {user.lastName}
              </div>
              <div className="profile-birth-date">---</div>
              <div className="profile-position-department">
                <span className="position">---</span>
                <span className="department">---</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Средняя секция - Контакты и безопасность */}
      <div className="profile-middle-section">
        {/* Левая колонка - Контакты и связь */}
        <div className="contacts-column">
          <h3 className="column-title">Контакты и связь</h3>

          <div className="contact-field">
            <div className="field-label">Email основной</div>
            <div className="field-value">{user.email}</div>
          </div>

          <div className="contact-field">
            <div className="field-label">Email дополнительный</div>
            <div className="field-value">---</div>
          </div>

          <div className="contact-field">
            <div className="field-label">Номер телефона</div>
            <div className="field-value">---</div>
          </div>

          <div className="contact-field">
            <div className="field-label">LinkedIn</div>
            <div className="field-value">---</div>
          </div>
        </div>

        {/* Правая колонка - Безопасность и доступ */}
        <div className="security-column">
          <h3 className="column-title">Безопасность и доступ</h3>

          <div className="security-field">
            <div className="field-content">
              <div className="field-label">Изменение пароля</div>
              <div className="field-value">Последний раз изменен 3 месяца назад</div>
            </div>
            <button className="action-button">Изменить</button>
          </div>

          <div className="security-field">
            <div className="field-content">
              <div className="field-label">Двухфакторная аутентификация</div>
              <div className="field-value">Выкл.</div>
            </div>
            <button className="action-button primary">Подключить</button>
          </div>

          <div className="security-field">
            <div className="field-content">
              <div className="field-label">Список доверенных IP</div>
              <div className="field-value">White list</div>
            </div>
            <button className="action-button secondary">
              <span className="gear-icon">⚙️</span> Управление
            </button>
          </div>

          <div className="security-field">
            <div className="field-content">
              <div className="field-label">История входов</div>
              <div className="field-value">Последний вход: сегодня в 7:21, Минск</div>
            </div>
            <button className="action-button">Посмотреть все</button>
          </div>
        </div>
      </div>

      {/* Нижняя секция - Инструкция по использованию */}
      <div className="profile-bottom-section">
        <div className="instructions-grid">
          <div className="instruction-item" onClick={handleNavigateToProjects}>
            <div className="instruction-icon">📊</div>
            <div className="instruction-count">{projectsCount}</div>
            <div className="instruction-label">Мои проекты</div>
          </div>

          <div className="instruction-item" onClick={handlePlaceholderAction}>
            <div className="instruction-icon">👤</div>
            <div className="instruction-count">---</div>
            <div className="instruction-label">Мои роли</div>
          </div>

          <div className="instruction-item" onClick={handlePlaceholderAction}>
            <div className="instruction-icon">👥</div>
            <div className="instruction-count">---</div>
            <div className="instruction-label">Команда</div>
          </div>

          <div className="instruction-item" onClick={handlePlaceholderAction}>
            <div className="instruction-icon">📅</div>
            <div className="instruction-count">{activeDays}</div>
            <div className="instruction-label">Активные дни</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalAccount;