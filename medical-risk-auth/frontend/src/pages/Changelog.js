import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Changelog.css';

const Changelog = () => {
    const [projects, setProjects] = useState([]);
    const [showReturn, setShowReturn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Get user info to check access
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            
            // New access check: SYS_ADMIN can see all, USER can see own project logs
            // Note: The actual access control is handled by the backend
        }

        fetchProjectsChangelog();
        const onScroll = () => {
            const content = document.querySelector('.content-body');
            const scrollTop = content ? content.scrollTop : (window.pageYOffset || document.documentElement.scrollTop);
            setShowReturn(scrollTop > 100);
        };
        (window).addEventListener('scroll', onScroll);
        onScroll();
        return () => (window).removeEventListener('scroll', onScroll);
    }, []);

    const fetchProjectsChangelog = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/api/changelog/projects', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 403) {
                setError('Access denied. Only administrators can view changelog.');
                setLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch changelog');
            }

            const data = await response.json();
            setProjects(data.projects);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        const statusColors = {
            'draft': '#9A9B9F',
            'in_progress': '#FC7171',
            'review': '#FFB74D',
            'completed': '#81C784',
            'archived': '#9E9E9E'
        };
        return statusColors[status] || '#9A9B9F';
    };

    const getStatusText = (status) => {
        const statusTexts = {
            'draft': 'Draft',
            'in_progress': 'In progress',
            'review': 'Under review',
            'completed': 'Completed',
            'archived': 'Archived'
        };
        return statusTexts[status] || status;
    };

    const handleViewFullHistory = (projectId) => {
        navigate(`/changelog/project/${projectId}`);
    };

    const handleChangeClick = (changeId) => {
        console.log(`🔄 Navigating to change detail: ${changeId}`);
        navigate(`/changelog/change/${changeId}`);
    };

    const translateRuToEn = (text) => {
        if (!text || typeof text !== 'string') return text;
        const replacements = [
            [/(Обновлен|Обновлён) проект/gi, 'Project updated'],
            [/(Изменен|Изменён) статус проекта/gi, 'Project status changed'],
            [/Изменены поля:/gi, 'Changed fields:'],
            [/Создан риск/gi, 'Risk created'],
            [/(Обновлен|Обновлён) риск/gi, 'Risk updated'],
            [/Создан проект/gi, 'Project created'],
            [/Создан новый проект/gi, 'New project created'],
            [/в проекте/gi, 'in project'],
        ];
        return replacements.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
    };

    if (loading) {
        return (
            <div className="changelog-container">
                <div className="changelog-header">
                    <h1>Changelog</h1>
                </div>
                <div className="loading">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="changelog-container">
                <div className="changelog-header">
                    <h1>Changelog</h1>
                </div>
                <div className="error-message">
                    <div className="error-icon">🚫</div>
                    <h3>Access denied</h3>
                    <p>{error}</p>
                    <p>You can only view logs of the projects you created.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="changelog-container">
            <div className="changelog-header">
                <h1>Changelog</h1>
                <p>
                    {user?.role === 'SYS_ADMIN' 
                        ? 'Change history for all system projects'
                        : 'Change history for your projects'
                    }
                </p>
            </div>

            <div className="projects-changelog-list">
                {projects.map((project) => (
                    <div key={project.project_id} className="project-changelog-card">
                        <div className="project-info">
                            <div className="project-main-info">
                                <div className="project-status-indicator">
                                    <div 
                                        className="status-circle" 
                                        style={{ backgroundColor: getStatusColor(project.project_status) }}
                                    />
                                    <span className="project-version">1</span>
                                </div>
                                <div className="project-details">
                                    <h3 className="project-name">{project.project_name}</h3>
                                    <p className="project-description">
                                        {project.project_description || 'No project description'}
                                    </p>
                                    <div className="project-device">
                                        <span className="device-label">Device:</span>
                                        <span className="device-name">{project.device_name}</span>
                                    </div>
                                    <div className="project-meta">
                                        <div className="project-status">
                                            <span 
                                                className="status-badge"
                                                style={{ backgroundColor: getStatusColor(project.project_status) }}
                                            >
                                                {getStatusText(project.project_status)}
                                            </span>
                                        </div>
                                        <div className="project-stats">
                                            <div className="stat-item">
                                                <span className="stat-label">Members:</span>
                                                <span className="stat-value">{project.members_count}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Updated:</span>
                                                <span className="stat-value">{formatDate(project.last_updated)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="project-changelog">
                            <h4>Recent changes</h4>
                            <div className="recent-changes">
                                {project.recent_changes.length === 0 ? (
                                    <div className="no-changes">
                                        <p>No changes yet</p>
                                    </div>
                                ) : (
                                    <div className="changes-list">
                                        {project.recent_changes.map((change, index) => (
                                            <div 
                                                key={change.id} 
                                                className="change-item clickable"
                                                onClick={() => handleChangeClick(change.id)}
                                            >
                                                <div className="change-info">
                                                    <div className="change-user">
                                                        <span className="user-name">{change.user_name}</span>
                                                        <span className="user-role">({change.user_role})</span>
                                                    </div>
                                                    <div className="change-action">{translateRuToEn(change.action_display_name)}</div>
                                                    <div className="change-time">{formatDate(change.created_at)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {project.total_changes > 4 && (
                                <div className="view-full-history">
                                    <button 
                                        className="view-history-btn"
                                        onClick={() => handleViewFullHistory(project.project_id)}
                                    >
                                        View change history ({project.total_changes})
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {projects.length === 0 && (
                <div className="no-projects">
                    <div className="no-projects-message">
                        <h3>No projects available for logs</h3>
                        <p>
                            {user?.role === 'SYS_ADMIN' 
                                ? 'There are no projects with changes in the system.'
                                : 'You do not have admin rights in any project. Logs are only available to project admins.'
                            }
                        </p>
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

export default Changelog;
