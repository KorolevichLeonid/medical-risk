import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChangelogHistory.css';

const ChangelogHistory = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [changelogs, setChangelogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);

    const pageSize = 20;

    useEffect(() => {
        // Access control is now handled by backend API
        // No need for frontend access checks

        fetchProjectChangelog();
    }, [projectId, currentPage]);

    const fetchProjectChangelog = async () => {
        if (currentPage > 1) {
            setLoadingMore(true);
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:8000/api/changelog/project/${projectId}?page=${currentPage}&size=${pageSize}`,
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
                setError('Project not found.');
                setLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch project changelog');
            }

            const data = await response.json();
            
            if (currentPage === 1) {
                setChangelogs(data.changelogs);
                // Get project info from first changelog entry
                if (data.changelogs.length > 0) {
                    setProject({
                        id: projectId,
                        name: data.changelogs[0].project_name
                    });
                }
            } else {
                setChangelogs(prev => [...prev, ...data.changelogs]);
            }
            
            setTotal(data.total);
            setTotalPages(data.total_pages);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (currentPage < totalPages && !loadingMore) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handleViewChange = (changelogId) => {
        navigate(`/changelog/change/${changelogId}`);
    };

    const handleBackToChangelog = () => {
        navigate('/changelog');
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

    const formatDateShort = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (loading && currentPage === 1) {
        return (
            <div className="changelog-history-container">
                <div className="changelog-history-header">
                    <button className="back-btn" onClick={handleBackToChangelog}>
                        ← Back to Changelog
                    </button>
                    <h1>Change history</h1>
                </div>
                <div className="loading">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="changelog-history-container">
                <div className="changelog-history-header">
                    <button className="back-btn" onClick={handleBackToChangelog}>
                        ← Back to Changelog
                    </button>
                    <h1>Change history</h1>
                </div>
                <div className="error-message">
                    <div className="error-icon">❌</div>
                    <h3>Error</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="changelog-history-container">
            <div className="changelog-history-header">
                <button className="back-btn" onClick={handleBackToChangelog}>
                    ← Back to Changelog
                </button>
                <div className="header-content">
                    <h1>Change history</h1>
                    {project && (
                        <p className="project-name">Project: {project.name}</p>
                    )}
                    <p className="total-changes">Total changes: {total}</p>
                </div>
            </div>

            <div className="changelog-history-content">
                {changelogs.length === 0 ? (
                    <div className="no-changes">
                        <p>История изменений пуста</p>
                    </div>
                ) : (
                    <div className="changes-timeline">
                        {changelogs.map((change, index) => (
                            <div 
                                key={change.id} 
                                className="timeline-item"
                                onClick={() => handleViewChange(change.id)}
                            >
                                <div className="timeline-marker">
                                    <div className="timeline-dot" />
                                    {index < changelogs.length - 1 && (
                                        <div className="timeline-line" />
                                    )}
                                </div>
                                
                                <div className="timeline-content">
                                    <div className="change-header">
                                        <h3 className="change-action">{translateRuToEn(change.action_display_name)}</h3>
                                        <span className="change-date">{formatDate(change.created_at)}</span>
                                    </div>
                                    
                                    <div className="change-details">
                                        <div className="change-user">
                                            <span className="user-name">{change.user_name}</span>
                                            <span className="user-role">({change.user_role})</span>
                                        </div>
                                        
                                        <p className="change-description">{translateRuToEn(change.action_description)}</p>
                                        
                                        {change.target_name && (
                                            <div className="change-target">
                                                <span className="target-label">Target:</span>
                                                <span className="target-name">{change.target_name}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="view-details-hint">
                                        <span>Click to view details →</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {currentPage < totalPages && (
                    <div className="load-more-container">
                        <button 
                            className="load-more-btn"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? 'Загрузка...' : 'Загрузить еще'}
                        </button>
                    </div>
                )}

                {changelogs.length > 0 && currentPage >= totalPages && (
                    <div className="end-of-list">
                        <p>Вы просмотрели все изменения</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChangelogHistory;
