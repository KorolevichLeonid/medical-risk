import React, { useState, useEffect } from 'react';
import './RoleManagement.css';

const RoleManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
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

    const roleIsAll = filterRole === 'all';
    const matchesSystemRole = user.systemRole === filterRole;
    const matchesProjectRole = (user.projects || []).some(p => p.role === filterRole);

    const matchesRole = roleIsAll || matchesSystemRole || matchesProjectRole;
    
    return matchesSearch && matchesRole;
  });

  const getSystemRoleBadge = (role) => {
    if (!role) return null; // Don't show system role for regular users
    
    const roleConfig = {
      SYS_ADMIN: { label: 'System Administrator', className: 'role-sys-admin' },
      USER: { label: 'User', className: 'role-user' },
    };
    
    const config = roleConfig[role] || { label: 'User', className: 'role-user' };
    return <span className={`role-badge ${config.className}`}>{config.label}</span>;
  };

  const getProjectRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: 'Admin', className: 'project-role-admin' },
      manager: { label: 'Manager', className: 'project-role-manager' },
      doctor: { label: 'Doctor', className: 'project-role-doctor' }
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
      return <span className="no-projects">No projects</span>;
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
    if (!window.confirm('Promote user to System Administrator?')) {
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
        alert('User successfully promoted to System Administrator');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to promote user:', error);
      alert('Server connection error');
    }
  };

  if (loading) {
    return (
      <div className="role-management">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="role-management">
      {/* Header */}
      <div className="management-header">
        <div className="header-content">
          <h1>User Management</h1>
          <p>
            {currentUser?.role === 'SYS_ADMIN' 
              ? 'View all users and their roles in projects'
              : 'Members of your projects'
            }
          </p>
        </div>
      </div>

      {/* User Statistics - only for SYS_ADMIN */}
      {currentUser?.role === 'SYS_ADMIN' && (
        <div className="user-stats">
          <div className="stat-card">
            <div className="stat-number">{users.length}</div>
            <div className="stat-label">Total users</div>
          </div>

          <div className="stat-card">
            <div className="stat-number">{users.filter(u => u.systemRole === 'SYS_ADMIN').length}</div>
            <div className="stat-label">System admins</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{users.filter(u => u.systemRole === 'USER').length}</div>
            <div className="stat-label">Users</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="management-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-section">
          <label>Role</label>
          <select
            className="filter-select"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All roles</option>
            <option value="SYS_ADMIN">System admin</option>
            <option value="USER">System user</option>
            <option value="admin">Project admin</option>
            <option value="manager">Project manager</option>
            <option value="doctor">Project doctor</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Projects</th>
              <th>Last login</th>
              {currentUser?.role === 'SYS_ADMIN' && <th>Actions</th>}
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
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                {currentUser?.role === 'SYS_ADMIN' && (
                  <td className="actions-cell">
                    {user.systemRole === 'USER' && (
                      <button 
                        className="action-btn promote"
                        onClick={() => handlePromoteToAdmin(user.id)}
                        title="Promote to System Administrator"
                      >
                        ⬆️ Promote
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
          <h3>No users found</h3>
          <p>
            {currentUser?.role === 'SYS_ADMIN' 
              ? 'No users in the system'
              : 'No members in your projects'
            }
          </p>
        </div>
      )}

      {/* Projects Modal */}
      {showProjectsModal && (
        <div className="modal-overlay" onClick={() => setShowProjectsModal(false)}>
          <div className="modal-content projects-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>All user projects</h2>
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
                Close
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