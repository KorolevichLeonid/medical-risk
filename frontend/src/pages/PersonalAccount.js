import React, { useState, useEffect } from 'react';
import './PersonalAccount.css';

const PersonalAccount = () => {
  const [user, setUser] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      browser: true,
      mobile: false
    }
  });


  useEffect(() => {
    loadUserData();
    loadStatistics();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Создаем объект пользователя с пустыми полями, если они не заполнены
        const user = {
          id: userData.id,
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          email: userData.email,
          phone: userData.phone || '',
          department: userData.department || '',
          position: userData.position || '',
          role: userData.role,
          language: userData.language || 'en',
          timezone: userData.timezone || 'UTC',
          avatar: userData.avatar_url || '/api/placeholder/120/120',
          joinDate: userData.created_at,
          lastLogin: userData.last_login,
          notifications: {
            email: userData.email_notifications !== false,
            browser: userData.browser_notifications !== false,
            mobile: userData.mobile_notifications !== false
          },
          recentActivity: [] // TODO: получать из API
        };
        
        setUser(user);
        setFormData({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          department: user.department,
          position: user.position,
          language: user.language,
          timezone: user.timezone,
          notifications: user.notifications
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

  const loadStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users/me/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const statsData = await response.json();
        setStatistics(statsData);
      } else {
        console.error('Failed to load statistics:', response.status);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('notifications.')) {
      const notificationKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [notificationKey]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          position: formData.position,
          language: formData.language,
          timezone: formData.timezone,
          email_notifications: formData.notifications.email,
          browser_notifications: formData.notifications.browser,
          mobile_notifications: formData.notifications.mobile
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        // Обновляем localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        // Перезагружаем данные пользователя и статистику
        loadUserData();
        loadStatistics();
        setIsEditing(false);
        alert('Профиль успешно обновлен!');
      } else {
        console.error('Failed to update profile:', response.status);
        alert('Ошибка при обновлении профиля');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Ошибка соединения с сервером');
    }
  };



  const getRoleBadge = (role) => {
    const roleConfig = {
      SYS_ADMIN: { label: 'Системный администратор', className: 'role-sys-admin' },
      USER: { label: 'Пользователь', className: 'role-user' },
    };
    
    const config = roleConfig[role] || { label: 'Пользователь', className: 'role-user' };
    return <span className={`role-badge ${config.className}`}>{config.label}</span>;
  };

  const getRoleDescription = (role) => {
    if (role === 'SYS_ADMIN') {
      return 'Полный доступ к управлению системой, пользователями и всеми проектами';
    } else {
      return 'Доступ к своим проектам с возможностью участия в качестве администратора, врача или менеджера проекта';
    }
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
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-info">
          <div className="profile-avatar">
            <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
            <button className="avatar-edit-btn">📷</button>
          </div>
          <div className="profile-details">
            <h1>{user.firstName} {user.lastName}</h1>
            <p className="profile-email">{user.email}</p>
            <div className="profile-meta">
              <div className="role-info">
                {getRoleBadge(user.role)}
                <div className="role-description">{getRoleDescription(user.role)}</div>
              </div>
              <span className="profile-department">{user.department}</span>
            </div>
          </div>
        </div>
        
        <div className="profile-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <div className="account-content">
        {/* Personal Information */}
        <div className="info-section">
          <h2>Personal Information</h2>
          
          {isEditing ? (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
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
                  <label htmlFor="lastName">Last Name</label>
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

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="department">Department</label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="position">Position</label>
                  <input
                    type="text"
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="language">Language</label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                  >
                    <option value="en">English</option>
                    <option value="ru">Russian</option>
                    <option value="de">German</option>
                    <option value="fr">French</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="timezone">Timezone</label>
                  <select
                    id="timezone"
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleInputChange}
                  >
                    <option value="UTC">UTC</option>
                    <option value="EST">Eastern Time</option>
                    <option value="PST">Pacific Time</option>
                    <option value="CET">Central European Time</option>
                    <option value="MSK">Moscow Time</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="info-display">
              <div className="info-grid">
                <div className="info-item">
                  <label>First Name:</label>
                  <span>{user.firstName}</span>
                </div>
                <div className="info-item">
                  <label>Last Name:</label>
                  <span>{user.lastName}</span>
                </div>
                <div className="info-item">
                  <label>Email:</label>
                  <span>{user.email}</span>
                </div>
                <div className="info-item">
                  <label>Phone:</label>
                  <span>{user.phone || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <label>Department:</label>
                  <span>{user.department}</span>
                </div>
                <div className="info-item">
                  <label>Position:</label>
                  <span>{user.position}</span>
                </div>
                <div className="info-item">
                  <label>Language:</label>
                  <span>{user.language === 'en' ? 'English' : user.language}</span>
                </div>
                <div className="info-item">
                  <label>Timezone:</label>
                  <span>{user.timezone}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Account Statistics */}
        <div className="stats-section">
          <h2>Account Statistics</h2>
          {statistics ? (
            <div className="stats-grid">
              {user.role === 'SYS_ADMIN' ? (
                // Sys Admin Statistics
                <>
                  <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                      <div className="stat-number">{statistics.total_projects}</div>
                      <div className="stat-label">Total Projects</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <div className="stat-number">{statistics.total_users}</div>
                      <div className="stat-label">Total Users</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-info">
                      <div className="stat-number">{statistics.total_risk_analyses}</div>
                      <div className="stat-label">Total Risks Analyzed</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🚀</div>
                    <div className="stat-info">
                      <div className="stat-number">{statistics.active_projects}</div>
                      <div className="stat-label">Active Projects</div>
                    </div>
                  </div>
                </>
              ) : (
                // User Statistics
                <>
                  <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                      <div className="stat-number">{statistics.user_projects}</div>
                      <div className="stat-label">My Projects</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-info">
                      <div className="stat-number">{statistics.user_risk_analyses}</div>
                      <div className="stat-label">My Risks Analyzed</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-info">
                      <div className="stat-number">{Math.floor((new Date() - new Date(user.joinDate)) / (1000 * 60 * 60 * 24))}</div>
                      <div className="stat-label">Days Active</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading statistics...</p>
            </div>
          )}
        </div>

        {/* Notification Settings */}
        <div className="notifications-section">
          <h2>Notification Preferences</h2>
          
          {isEditing ? (
            <div className="notification-settings">
              <label className="notification-item">
                <input
                  type="checkbox"
                  name="notifications.email"
                  checked={formData.notifications.email}
                  onChange={handleInputChange}
                />
                <span>Email Notifications</span>
                <small>Receive updates via email</small>
              </label>
              
              <label className="notification-item">
                <input
                  type="checkbox"
                  name="notifications.browser"
                  checked={formData.notifications.browser}
                  onChange={handleInputChange}
                />
                <span>Browser Notifications</span>
                <small>Show notifications in browser</small>
              </label>
              
              <label className="notification-item">
                <input
                  type="checkbox"
                  name="notifications.mobile"
                  checked={formData.notifications.mobile}
                  onChange={handleInputChange}
                />
                <span>Mobile Notifications</span>
                <small>Push notifications to mobile device</small>
              </label>
            </div>
          ) : (
            <div className="notification-display">
              <div className="notification-status">
                <span className={`status ${user.notifications.email ? 'enabled' : 'disabled'}`}>
                  Email: {user.notifications.email ? 'Enabled' : 'Disabled'}
                </span>
                <span className={`status ${user.notifications.browser ? 'enabled' : 'disabled'}`}>
                  Browser: {user.notifications.browser ? 'Enabled' : 'Disabled'}
                </span>
                <span className={`status ${user.notifications.mobile ? 'enabled' : 'disabled'}`}>
                  Mobile: {user.notifications.mobile ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {user.recentActivity.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-content">
                  <div className="activity-action">{activity.action}</div>
                  <div className="activity-time">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


    </div>
  );
};

export default PersonalAccount;
