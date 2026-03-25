import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './DocumentView.css';
import API_BASE_URL from '../config';

const DocumentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  useEffect(() => {
    loadProjectData();
    loadCurrentDocument();
    loadVersionHistory();

    // Hide sidebar for documents page
    const className = 'hide-floating-shortcuts';
    document.body.classList.add(className);
    return () => {
      document.body.classList.remove(className);
    };
  }, [id]);

  useEffect(() => {
    if (selectedVersion && selectedVersion.id) {
      setPreviewError(null); // Clear previous error
      loadDocumentPreview(selectedVersion.id);
    } else {
      setPreviewHtml(null);
      setPreviewError(null);
    }
  }, [selectedVersion, id]);

  const loadProjectData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const projectData = await response.json();
        setProject(projectData);
      } else {
        console.error('Failed to load project');
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const loadCurrentDocument = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/projects/${id}/current`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentDocument(data);
        setSelectedVersion(data);
      }
    } catch (error) {
      console.error('Error loading current document:', error);
    }
  };

  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/projects/${id}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      }
    } catch (error) {
      console.error('Error loading version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkReportGenerationConditions = async () => {
    // Document generation is now allowed regardless of matrix completeness or risk closure status
    return { canGenerate: true, message: '' };
  };

  const handleGenerateDocument = async () => {
    // Проверяем условия перед генерацией
    const checkResult = await checkReportGenerationConditions();
    
    if (!checkResult.canGenerate) {
      alert(`⚠️ Невозможно сгенерировать отчет:\n\n${checkResult.message}\n\nПожалуйста, заполните все комбинации матрицы рисков и закройте все риски.`);
      return;
    }
    
    if (!confirm('Generate a new version of the Risk Management Report?')) return;

    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/projects/${id}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auto_version: true
        })
      });

      if (response.ok) {
        const newVersion = await response.json();
        alert(`Document version ${newVersion.version} generated successfully!`);
        
        // Reload data
        await loadCurrentDocument();
        await loadVersionHistory();
        
        // Load preview for the new version
        if (newVersion.id) {
          setSelectedVersion(newVersion);
          await loadDocumentPreview(newVersion.id);
        }
      } else {
        const error = await response.json();
        alert(`Failed to generate document: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadDocument = async (versionId, format = 'docx') => {
    try {
      console.log(`Starting ${format.toUpperCase()} download for version:`, versionId);
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Ошибка: Требуется авторизация');
        return;
      }

      const acceptHeader = format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const response = await fetch(
        `${API_BASE_URL}/api/documents/projects/${id}/versions/${versionId}/download?format=${format}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': acceptHeader
          }
        }
      );

      console.log('Download response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed:', errorText);
        alert(`Ошибка при скачивании документа: ${response.status} ${response.statusText}`);
        return;
      }

      // Get blob from response
      const blob = await response.blob();
      console.log('Blob received, size:', blob.size, 'bytes');

      if (blob.size === 0) {
        alert('Ошибка: Получен пустой файл');
        return;
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const extension = format === 'pdf' ? 'pdf' : 'docx';
      let filename = `Risk_Management_Report_P${id}_V${selectedVersion?.version || '1.0'}.${extension}`;

      if (contentDisposition) {
        console.log('Content-Disposition:', contentDisposition);
        // Try multiple patterns to extract filename
        let filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (!filenameMatch) {
          filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        }
        if (!filenameMatch) {
          filenameMatch = contentDisposition.match(/filename=(.+)/);
        }

        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
          // Decode URI if needed
          try {
            filename = decodeURIComponent(filename);
          } catch (e) {
            console.warn('Failed to decode filename, using as is');
          }
        }
      }

      console.log(`Downloading ${format.toUpperCase()} file as:`, filename);

      // Create object URL from blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Create temporary anchor element
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      downloadLink.style.display = 'none';
      downloadLink.setAttribute('download', filename); // Ensure download attribute is set

      // Append to body
      document.body.appendChild(downloadLink);

      // Trigger download immediately
      downloadLink.click();

      console.log(`${format.toUpperCase()} download triggered`);

      // Cleanup after a delay to ensure download starts
      setTimeout(() => {
        if (document.body.contains(downloadLink)) {
          document.body.removeChild(downloadLink);
        }
        window.URL.revokeObjectURL(blobUrl);
        console.log('Cleanup completed');
      }, 1000);

    } catch (error) {
      console.error(`Error downloading ${format} document:`, error);
      alert(`Ошибка при скачивании документа: ${error.message}`);
    }
  };

  const handleDownloadPDF = async (versionId) => {
    await handleDownloadDocument(versionId, 'pdf');
  };

  const loadDocumentPreview = async (versionId) => {
    if (!versionId) {
      console.warn('No version ID provided for preview');
      setPreviewHtml(null);
      setPreviewError('Версия документа не выбрана');
      setLoadingPreview(false);
      return;
    }

    setLoadingPreview(true);
    setPreviewError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        setPreviewHtml(null);
        setPreviewError('Требуется авторизация');
        setLoadingPreview(false);
        return;
      }

      const selected = versions.find((v) => v.id === versionId) || selectedVersion;
      const isCurrentVersion = Boolean(selected?.is_current);

      const previewUrl = isCurrentVersion
        ? `${API_BASE_URL}/api/documents/projects/${id}/preview-live?version_id=${versionId}`
        : `${API_BASE_URL}/api/documents/projects/${id}/versions/${versionId}/preview`;

      console.log(
        `Loading ${isCurrentVersion ? 'live' : 'snapshot'} preview for project ${id}, version ${versionId}`
      );

      const response = await fetch(
        previewUrl,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/html'
          }
        }
      );

      console.log(`Preview response status: ${response.status}`);

      if (response.ok) {
        const html = await response.text();
        console.log(`Preview HTML received, length: ${html.length} characters`);
        if (html && html.length > 0) {
          setPreviewHtml(html);
          setPreviewError(null);
        } else {
          console.warn('Received empty HTML preview');
          setPreviewHtml(null);
          setPreviewError('Получен пустой preview документа');
        }
      } else {
        const errorText = await response.text();
        console.error(`Failed to load preview: ${response.status} ${response.statusText}`, errorText);
        setPreviewHtml(null);
        
        if (response.status === 404) {
          setPreviewError('Версия документа не найдена. Возможно, документ еще не был сгенерирован.');
        } else if (response.status === 403) {
          setPreviewError('Нет доступа к просмотру этого документа');
        } else {
          setPreviewError(`Ошибка загрузки preview: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      setPreviewHtml(null);
      setPreviewError(`Ошибка сети: ${error.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleViewVersion = async (versionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/documents/projects/${id}/versions/${versionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedVersion(data);
        setShowVersionHistory(false);
      }
    } catch (error) {
      console.error('Error loading version:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && versions.length === 0) {
    return (
      <div className="document-view">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-view">
      {/* Header */}
      <div className="document-header">
        <div className="header-main">
          <button 
            className="back-button"
            onClick={() => navigate(`/project/${id}`)}
          >
            ← Back to Project
          </button>
          <h1>Risk Management Report</h1>
          {project && <p className="project-name">{project.device_name}</p>}
        </div>

        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowVersionHistory(!showVersionHistory)}
          >
            Version History ({versions.length})
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleGenerateDocument}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate New Version'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="document-content">
        {/* Current/Selected Document */}
        {selectedVersion ? (
          <div className="document-preview">
            <div className="document-info-card">
              <div className="document-badge-container">
                <h2>Document Information</h2>
                {selectedVersion.is_current && (
                  <span className="badge badge-current">Current Version</span>
                )}
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <label>Version:</label>
                  <span className="version-number">{selectedVersion.version}</span>
                </div>
                <div className="info-item">
                  <label>Report Number:</label>
                  <span>{selectedVersion.report_number || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>File Name:</label>
                  <span>{selectedVersion.file_name}</span>
                </div>
                <div className="info-item">
                  <label>File Size:</label>
                  <span>{formatFileSize(selectedVersion.file_size)}</span>
                </div>
                <div className="info-item">
                  <label>Generated By:</label>
                  <span>{selectedVersion.generator_name}</span>
                </div>
                <div className="info-item">
                  <label>Generated At:</label>
                  <span>{formatDate(selectedVersion.generated_at)}</span>
                </div>
              </div>

            </div>

            {/* Document Viewer */}
            <div className="document-viewer-wrapper">
              <div className="viewer-header">
                <h3>📄 Document Preview</h3>
              </div>
              <div className="document-viewer-frame">
                {loadingPreview ? (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading document preview...</p>
                  </div>
                ) : previewHtml ? (
                  <div 
                    className="document-preview-content"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <div className="preview-error">
                    <div className="error-icon">⚠️</div>
                    <h4>Не удалось загрузить preview документа</h4>
                    {previewError ? (
                      <p className="error-message">{previewError}</p>
                    ) : (
                      <p>Пожалуйста, попробуйте скачать документ для просмотра.</p>
                    )}
                    {selectedVersion && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleDownloadDocument(selectedVersion.id)}
                        >
                          ⬇️ Download (DOCX)
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleDownloadPDF(selectedVersion.id)}
                        >
                          ⬇️ Download (PDF)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="no-document">
            <div className="no-document-icon">📄</div>
            <h2>No Document Generated</h2>
            <p>No Risk Management Report has been generated for this project yet.</p>
            <button 
              className="btn btn-primary btn-large"
              onClick={handleGenerateDocument}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate First Version'}
            </button>
          </div>
        )}

        {/* Version History Sidebar */}
        {showVersionHistory && versions.length > 0 && (
          <div className="version-history-panel">
            <div className="panel-header">
              <h3>Version History</h3>
              <button 
                className="close-panel-btn"
                onClick={() => setShowVersionHistory(false)}
              >
                ×
              </button>
            </div>
            <div className="version-list">
              {versions.map((version) => (
                <div 
                  key={version.id} 
                  className={`version-item ${selectedVersion?.id === version.id ? 'selected' : ''}`}
                  onClick={() => handleViewVersion(version.id)}
                >
                  <div className="version-header">
                    <span className="version-number">v{version.version}</span>
                    {version.is_current && (
                      <span className="badge badge-current-small">Current</span>
                    )}
                  </div>
                  <div className="version-info">
                    <div className="version-meta">
                      <span className="version-date">{formatDate(version.generated_at)}</span>
                      <span className="version-author">{version.generator_name}</span>
                    </div>
                    <div className="version-file">
                      <span className="file-size">{formatFileSize(version.file_size)}</span>
                    </div>
                  </div>
                  <div className="version-actions">
                    <button 
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadDocument(version.id);
                      }}
                      title="Download this version"
                    >
                      ⬇️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Download Buttons - only show if document exists */}
      {selectedVersion && (
        <div className="floating-download-btn">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-primary btn-floating"
              onClick={() => handleDownloadDocument(selectedVersion.id)}
              title="Download DOCX Document"
            >
              ⬇️ Download (DOCX)
            </button>
            <button
              className="btn btn-secondary btn-floating"
              onClick={() => handleDownloadPDF(selectedVersion.id)}
              title="Download PDF Document"
            >
              ⬇️ Download (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentView;
