import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Changelog.css';
import API_BASE_URL from '../config';

const Changelog = () => {
    const [projects, setProjects] = useState([]);
    const [showReturn, setShowReturn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
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
            const response = await fetch(`${API_BASE_URL}/api/changelog/projects`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 403) {
                setError('Доступ запрещён. Только администраторы могут просматривать журнал.');
                setLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error('Не удалось загрузить журнал изменений');
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
        return date.toLocaleString('ru-RU', {
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
            'draft': 'Черновик',
            'in_progress': 'В процессе',
            'review': 'На проверке',
            'completed': 'Завершено',
            'archived': 'Архивировано'
        };
        return statusTexts[status] || status;
    };

    const handleViewFullHistory = (projectId) => {
        navigate(`/changelog/project/${projectId}`);
    };

    const handleChangeClick = (changeId) => {
        navigate(`/changelog/change/${changeId}`);
    };

    if (loading) {
        return (
            <div className="changelog-container">
                <div className="changelog-header">
                    <h1>Журнал изменений</h1>
                </div>
                <div className="loading">Загрузка...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="changelog-container">
                <div className="changelog-header">
                    <h1>Журнал изменений</h1>
                </div>
                <div className="error-message">
                    <div className="error-icon">🚫</div>
                    <h3>Доступ запрещён</h3>
                    <p>{error}</p>
                    <p>Вы можете просматривать только журналы проектов, в которых вы являетесь администратором.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="changelog-container">
            <div className="changelog-header">
                <h1>Журнал изменений</h1>
                <p>
                    {user?.role === 'SYS_ADMIN'
                        ? 'История изменений всех проектов системы'
                        : 'История изменений ваших проектов'
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
                                        {project.project_description || 'Описание проекта отсутствует'}
                                    </p>
                                    <div className="project-device">
                                        <span className="device-label">Устройство:</span>
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
                                                <span className="stat-label">Участники:</span>
                                                <span className="stat-value">{project.members_count}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Обновлено:</span>
                                                <span className="stat-value">{formatDate(project.last_updated)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="project-changelog">
                            <h4>Последние изменения</h4>
                            <div className="recent-changes">
                                {project.recent_changes.length === 0 ? (
                                    <div className="no-changes">
                                        <p>Изменений пока нет</p>
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
                                                    <div className="change-action">{change.action_display_name}</div>
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
                                        Просмотреть всю историю ({project.total_changes})
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
                        <h3>Нет доступных проектов</h3>
                        <p>
                            {user?.role === 'SYS_ADMIN'
                                ? 'В системе нет проектов с изменениями.'
                                : 'У вас нет прав администратора ни в одном проекте. Журналы доступны только администраторам проектов.'
                            }
                        </p>
                    </div>
                </div>
            )}

            <button
                className={`floating-return ${showReturn ? 'visible' : ''}`}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Наверх"
            >
                ↑
            </button>
        </div>
    );
};

export default Changelog;
