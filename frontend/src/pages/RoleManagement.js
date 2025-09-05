import React, { useState, useEffect } from 'react';
import './RoleManagement.css';

const RoleManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [selectedUserProjects, setSelectedUserProjects] = useState([]);
  const [showReturn, setShowReturn] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
    const onScroll = () => {
      const content = document.querySelector('.content-body');
      const scrollTop = content ? content.scrollTop : (window.pageYOffset || document.documentElement.scrollTop);
      setShowReturn(scrollTop > 100);
    };
    (window).addEventListener('scroll', onScroll);
    onScroll();
    return () => (window).removeEventListener('scroll', onScroll);
  }, []);

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users/with-projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const usersData = await response.json();
        console.log('✅ Received users data:', usersData);
        
        // Transform data to match expected format
        const formattedUsers = usersData.map(user => ({
          id: user.id,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          email: user.email,
          systemRole: user.role || null, // Will be null for regular users (they don't see system roles)
          lastLogin: user.last_login || null,
          projects: user.projects || [],
          avatar: user.avatar_url || '/api/placeholder/50/50'
        }));
        
        console.log('✅ Formatted users:', formattedUsers);
        setUsers(formattedUsers);
      } else {
        console.error('Failed to load users:', response.status, response.statusText);
        try {
          const errorText = await response.text();
          console.error('Response body:', errorText);
        } catch (e) {
          console.error('Could not read response body:', e);
        }
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getSystemRoleBadge = (role) => {
    if (!role) return null; // Don't show system role for regular users
    
    const roleConfig = {
      SYS_ADMIN: { label: 'Системный администратор', className: 'role-sys-admin' },
      USER: { label: 'Пользователь', className: 'role-user' },
    };
    
    const config = roleConfig[role] || { label: 'Пользователь', className: 'role-user' };
    return <span className={`role-badge ${config.className}`}>{config.label}</span>;
  };

  const getProjectRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: 'Админ', className: 'project-role-admin' },
      manager: { label: 'Менеджер', className: 'project-role-manager' },
      doctor: { label: 'Врач', className: 'project-role-doctor' }
    };
    
    const config = roleConfig[role] || { label: role, className: 'project-role-unknown' };
    return <span className={`project-role-badge ${config.className}`}>{config.label}</span>;
  };

  const showAllProjects = (projects, userName) => {
    setSelectedUserProjects({ projects, userName });
    setShowProjectsModal(true);
  };
  const renderProjectsColumn = (user) => {
    if (!user.projects || user.projects.length === 0) {
      return <span className="no-projects">Нет проектов</span>;
    }

    const visibleProjects = user.projects.slice(0, 3);
    const hasMoreProjects = user.projects.length > 3;

    return (
      <div className="projects-column">
        {visibleProjects.map((project, index) => (
          <div key={project.id} className="project-entry">
            <span className="project-name">{project.name}</span>
            {getProjectRoleBadge(project.role)}
          </div>
        ))}
        {hasMoreProjects && (
          <button 
            className="show-all-projects-btn"
            onClick={() => showAllProjects(user.projects, `${user.firstName} ${user.lastName}`)}
          >
            <span className="dots">•••</span>
            <span className="count">+{user.projects.length - 3}</span>
          </button>
        )}
      </div>
    );
  };

  const handlePromoteToAdmin = async (userId) => {
    if (!window.confirm('Повысить пользователя до системного администратора?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: 'SYS_ADMIN'
        })
      });

      if (response.ok) {
        loadUsers(); // Reload users to get updated data
        alert('Пользователь успешно повышен до системного администратора');
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.detail || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Failed to promote user:', error);
      alert('Ошибка соединения с сервером');
    }
  };

  if (loading) {
    return (
      <div className="role-management">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Загрузка пользователей...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="role-management">
      {/* Header */}
      <div className="management-header">
        <div className="header-content">
          <h1>Управление пользователями</h1>
          <p>
            {currentUser?.role === 'SYS_ADMIN' 
              ? 'Просмотр всех пользователей системы и их ролей в проектах'
              : 'Участники ваших проектов'
            }
          </p>
        </div>
      </div>

      {/* User Statistics - только для SYS_ADMIN */}
      {currentUser?.role === 'SYS_ADMIN' && (
        <div className="user-stats">
          <div className="stat-card">
            <div className="stat-number">{users.length}</div>
            <div className="stat-label">Всего пользователей</div>
          </div>

          <div className="stat-card">
            <div className="stat-number">{users.filter(u => u.systemRole === 'SYS_ADMIN').length}</div>
            <div className="stat-label">Сис админов</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{users.filter(u => u.systemRole === 'USER').length}</div>
            <div className="stat-label">Пользователей</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="management-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Поиск пользователей..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Email</th>
              <th>Проекты</th>
              <th>Последний вход</th>
              {currentUser?.role === 'SYS_ADMIN' && <th>Действия</th>}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="user-row">
                <td className="user-cell">
                  <div className="user-info">
                    <div className="user-avatar">
                      <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user.firstName} {user.lastName}</div>
                      <div className="user-meta">
                        {getSystemRoleBadge(user.systemRole)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="email-cell">{user.email}</td>
                <td className="projects-cell">
                  {renderProjectsColumn(user)}
                </td>
                <td className="login-cell">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Никогда'}
                </td>
                {currentUser?.role === 'SYS_ADMIN' && (
                  <td className="actions-cell">
                    {user.systemRole === 'USER' && (
                      <button 
                        className="action-btn promote"
                        onClick={() => handlePromoteToAdmin(user.id)}
                        title="Повысить до системного администратора"
                      >
                        ⬆️ Повысить
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>Пользователи не найдены</h3>
          <p>
            {currentUser?.role === 'SYS_ADMIN' 
              ? 'Нет пользователей в системе'
              : 'Нет участников в ваших проектах'
            }
          </p>
        </div>
      )}

      {/* Projects Modal */}
      {showProjectsModal && (
        <div className="modal-overlay" onClick={() => setShowProjectsModal(false)}>
          <div className="modal-content projects-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Все проекты пользователя</h2>
              <button 
                className="close-btn"
                onClick={() => setShowProjectsModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="projects-list">
                {selectedUserProjects.projects?.map(project => (
                  <div key={project.id} className="project-item-modal">
                    <div className="project-info">
                      <h4>{project.name}</h4>
                      <p>{project.device_name}</p>
                    </div>
                    <div className="project-role">
                      {getProjectRoleBadge(project.role)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowProjectsModal(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        className={`floating-return ${showReturn ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Return to top"
      >
        ↑
      </button>
    </div>
  );
};

export default RoleManagement;