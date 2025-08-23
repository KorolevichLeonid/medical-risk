import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChangelogDetail.css';

const ChangelogDetail = () => {
    const { changelogId } = useParams();
    const navigate = useNavigate();
    const [changelog, setChangelog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Access control is now handled by backend API
        // No need for frontend access checks

        fetchChangelogDetail();
    }, [changelogId]);

    const fetchChangelogDetail = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:8000/api/changelog/${changelogId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.status === 403) {
                setError('Access denied. Only administrators can view changelog.');
                setLoading(false);
                return;
            }

            if (response.status === 404) {
                setError('Changelog entry not found.');
                setLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch changelog detail');
            }

            const data = await response.json();
            setChangelog(data);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate(-1); // Go back to previous page
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const renderValueComparison = (oldValues, newValues) => {
        if (!oldValues && !newValues) return null;

        const renderObject = (obj, title) => {
            if (!obj || typeof obj !== 'object') return null;
            
            return (
                <div className="values-section">
                    <h4>{title}</h4>
                    <div className="values-content">
                        {Object.entries(obj).map(([key, value]) => (
                            <div key={key} className="value-item">
                                <span className="value-key">{key}:</span>
                                <span className="value-value">
                                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        return (
            <div className="value-comparison">
                {renderObject(oldValues, 'Старые значения')}
                {renderObject(newValues, 'Новые значения')}
            </div>
        );
    };

    const renderMetadata = (metadata) => {
        if (!metadata || typeof metadata !== 'object') return null;

        return (
            <div className="metadata-section">
                <h4>Дополнительная информация</h4>
                <div className="metadata-content">
                    {Object.entries(metadata).map(([key, value]) => (
                        <div key={key} className="metadata-item">
                            <span className="metadata-key">{key}:</span>
                            <span className="metadata-value">
                                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="changelog-detail-container">
                <div className="loading">Загрузка...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="changelog-detail-container">
                <div className="error-message">
                    <div className="error-icon">❌</div>
                    <h3>Ошибка</h3>
                    <p>{error}</p>
                    <button className="back-btn" onClick={handleBack}>
                        Назад
                    </button>
                </div>
            </div>
        );
    }

    if (!changelog) {
        return (
            <div className="changelog-detail-container">
                <div className="error-message">
                    <h3>Запись не найдена</h3>
                    <button className="back-btn" onClick={handleBack}>
                        Назад
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="changelog-detail-container">
            <div className="changelog-detail-header">
                <button className="back-btn" onClick={handleBack}>
                    ← Назад
                </button>
                <h1>Детали изменения</h1>
            </div>

            <div className="changelog-detail-content">
                <div className="main-info-card">
                    <div className="action-header">
                        <h2>{changelog.action_display_name}</h2>
                        <div className="action-date">{formatDate(changelog.created_at)}</div>
                    </div>
                    
                    <div className="action-description">
                        <p>{changelog.action_description}</p>
                    </div>
                </div>

                <div className="details-grid">
                    <div className="detail-card">
                        <h3>Информация о пользователе</h3>
                        <div className="user-info">
                            <div className="info-item">
                                <span className="info-label">Имя:</span>
                                <span className="info-value">{changelog.user_name}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Email:</span>
                                <span className="info-value">{changelog.user_email}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Роль:</span>
                                <span className="info-value">{changelog.user_role}</span>
                            </div>
                            {changelog.user_position && (
                                <div className="info-item">
                                    <span className="info-label">Должность:</span>
                                    <span className="info-value">{changelog.user_position}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {(changelog.target_type || changelog.target_name || changelog.project_name) && (
                        <div className="detail-card">
                            <h3>Информация об объекте</h3>
                            <div className="target-info">
                                {changelog.target_type && (
                                    <div className="info-item">
                                        <span className="info-label">Тип объекта:</span>
                                        <span className="info-value">{changelog.target_type}</span>
                                    </div>
                                )}
                                {changelog.target_name && (
                                    <div className="info-item">
                                        <span className="info-label">Название:</span>
                                        <span className="info-value">{changelog.target_name}</span>
                                    </div>
                                )}
                                {changelog.project_name && (
                                    <div className="info-item">
                                        <span className="info-label">Проект:</span>
                                        <span className="info-value">{changelog.project_name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {(changelog.ip_address || changelog.user_agent) && (
                        <div className="detail-card">
                            <h3>Техническая информация</h3>
                            <div className="technical-info">
                                {changelog.ip_address && (
                                    <div className="info-item">
                                        <span className="info-label">IP адрес:</span>
                                        <span className="info-value">{changelog.ip_address}</span>
                                    </div>
                                )}
                                {changelog.user_agent && (
                                    <div className="info-item">
                                        <span className="info-label">User Agent:</span>
                                        <span className="info-value user-agent">{changelog.user_agent}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {(changelog.old_values || changelog.new_values) && (
                    <div className="changes-card">
                        <h3>Детали изменений</h3>
                        {renderValueComparison(changelog.old_values, changelog.new_values)}
                    </div>
                )}

                {changelog.extra_data && (
                    <div className="metadata-card">
                        {renderMetadata(changelog.extra_data)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChangelogDetail;
