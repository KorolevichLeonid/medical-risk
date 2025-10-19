import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './RiskAnalysis.css';

const RiskAnalysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [risks, setRisks] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [showEditRisk, setShowEditRisk] = useState(false);
  const [showViewRisk, setShowViewRisk] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProjectRole, setUserProjectRole] = useState(null);
  const [newRisk, setNewRisk] = useState({
    lifecycleStage: 'operation',
    hazardName: '',
    hazardousS: '',
    sequenceOfEvents: '',
    harm: '',
    hazardCategory: 'biological_chemical'
    // severityScore, probabilityScore, and controlMeasures are now managed in the risk table
  });

  useEffect(() => {
    loadCurrentUser();
    loadProjectAndRisks();
    loadUserProjectRole();
  }, [id]);

  const loadCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  };

  const loadUserProjectRole = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/projects/${id}/my-role`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const roleData = await response.json();
        console.log('Loaded user project role:', roleData);
        setUserProjectRole(roleData.user_role);
      } else {
        console.error('Failed to load user project role - status:', response.status);
        setUserProjectRole(null);
      }
    } catch (error) {
      console.error('Failed to load user project role:', error);
      setUserProjectRole(null);
    }
  };

  // Permission check functions
  const canAddRisks = () => {
    if (!currentUser || !userProjectRole) {
      return false;
    }
    // System admin can always manage risks
    if (currentUser.role === 'SYS_ADMIN') return true;
    // In project: only admin and manager can add risks (doctor can only view)
    return userProjectRole === 'admin' || userProjectRole === 'manager';
  };

  const canEditRisks = () => {
    if (!currentUser || !userProjectRole) {
      return false;
    }
    // System admin can always manage risks
    if (currentUser.role === 'SYS_ADMIN') return true;
    // In project: only admin and manager can edit risks (doctor can only view)
    return userProjectRole === 'admin' || userProjectRole === 'manager';
  };

  const canDeleteRisks = () => {
    if (!currentUser || !userProjectRole) {
      return false;
    }
    // System admin can always manage risks
    if (currentUser.role === 'SYS_ADMIN') return true;
    // In project: only admin and manager can delete risks (doctor can only view)
    return userProjectRole === 'admin' || userProjectRole === 'manager';
  };

  useEffect(() => {
    filterRisks();
  }, [risks, filterSeverity, filterCategory, searchTerm]);

  const loadProjectAndRisks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Load project data
      const projectResponse = await fetch(`http://localhost:8000/api/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProject({
          id: projectData.id,
          name: projectData.name,
          deviceName: projectData.device_name
        });
      }
      
      // Load risk factors
      const risksResponse = await fetch(`http://localhost:8000/api/risk-analyses/project/${id}/factors`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (risksResponse.ok) {
        const risksData = await risksResponse.json();
        const transformedRisks = risksData.map(risk => ({
          id: risk.id,
          lifecycleStage: risk.lifecycle_stage,
          hazardName: risk.hazard_name,
          hazardousS: risk.hazardous_situation,
          sequenceOfEvents: risk.sequence_of_events,
          harm: risk.harm,
          hazardCategory: risk.hazard_category,
          severityScore: risk.severity_score,
          probabilityScore: risk.probability_score,
          riskScore: risk.risk_score,
          controlMeasures: risk.control_measures || '',
          status: 'identified', // Default status for now
          lastUpdated: risk.updated_at || risk.created_at
        }));
        setRisks(transformedRisks);
      } else {
        setRisks([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setRisks([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRisks = () => {
    let filtered = risks;
    
    if (filterSeverity !== 'all') {
      const severityRange = {
        low: [1, 2, 3],
        medium: [4, 6, 8],
        high: [9, 10, 12, 15, 16, 20, 25]
      };
      filtered = filtered.filter(risk => severityRange[filterSeverity].includes(risk.riskScore));
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(risk => risk.hazardCategory === filterCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(risk => 
        risk.hazardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.hazardousS.toLowerCase().includes(searchTerm.toLowerCase()) ||
        risk.harm.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredRisks(filtered);
  };

  const getRiskLevel = (score) => {
    if (score <= 3) return { level: 'low', color: '#00AA44' };
    if (score <= 8) return { level: 'medium', color: '#FF8800' };
    return { level: 'high', color: '#FF4444' };
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      identified: { label: 'Identified', className: 'status-identified' },
      under_review: { label: 'Under Review', className: 'status-review' },
      mitigated: { label: 'Mitigated', className: 'status-mitigated' }
    };
    
    const config = statusConfig[status] || statusConfig.identified;
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  const handleAddRisk = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // First, get or create risk analysis for the project
      const analysisResponse = await fetch(`http://localhost:8000/api/risk-analyses/project/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      let analysisId;
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        analysisId = analysisData.id;
      } else {
        // Create new risk analysis if it doesn't exist
        const createAnalysisResponse = await fetch(`http://localhost:8000/api/risk-analyses/project/${id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            has_body_contact: false,
            contact_type: 'no_contact',
            risk_factors: []
          })
        });
        
        if (createAnalysisResponse.ok) {
          const newAnalysisData = await createAnalysisResponse.json();
          analysisId = newAnalysisData.id;
        } else {
          throw new Error('Failed to create risk analysis');
        }
      }
      
      // Add risk factor (scores and control measures will be set in risk table)
      const riskFactorData = {
        lifecycle_stage: newRisk.lifecycleStage,
        hazard_name: newRisk.hazardName,
        hazardous_situation: newRisk.hazardousS,
        sequence_of_events: newRisk.sequenceOfEvents,
        harm: newRisk.harm,
        hazard_category: newRisk.hazardCategory
        // severity_score, probability_score, control_measures are now optional
      };
      
      const addRiskResponse = await fetch(`http://localhost:8000/api/risk-analyses/${analysisId}/factors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(riskFactorData)
      });
      
      if (addRiskResponse.ok) {
        const responseData = await addRiskResponse.json();
        console.log('Risk created successfully:', responseData);
        
        // Reload risks
        loadProjectAndRisks();
        
        setNewRisk({
          lifecycleStage: 'operation',
          hazardName: '',
          hazardousS: '',
          sequenceOfEvents: '',
          harm: '',
          hazardCategory: 'biological_chemical'
        });
        setShowAddRisk(false);
        
        // Show success message
        alert('Risk added successfully!');
      } else {
        const errorData = await addRiskResponse.text();
        console.error('Failed to add risk factor:', errorData);
        alert('Failed to add risk. Please try again.');
      }
    } catch (error) {
      console.error('Failed to add risk:', error);
      alert('An error occurred while adding the risk. Please try again.');
    }
  };

  const handleEditRisk = async (e) => {
    e.preventDefault();
    if (!selectedRisk) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Update risk factor (scores and control measures are managed in risk table)
      const riskFactorData = {
        lifecycle_stage: selectedRisk.lifecycleStage,
        hazard_name: selectedRisk.hazardName,
        hazardous_situation: selectedRisk.hazardousS,
        sequence_of_events: selectedRisk.sequenceOfEvents,
        harm: selectedRisk.harm,
        hazard_category: selectedRisk.hazardCategory
        // severity_score, probability_score, control_measures are optional
      };
      
      const updateRiskResponse = await fetch(`http://localhost:8000/api/risk-analyses/factors/${selectedRisk.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(riskFactorData)
      });
      
      if (updateRiskResponse.ok) {
        const responseData = await updateRiskResponse.json();
        console.log('Risk updated successfully:', responseData);
        
        // Reload risks
        loadProjectAndRisks();
        setShowEditRisk(false);
        setSelectedRisk(null);
        
        // Show success message
        alert('Risk updated successfully!');
      } else {
        const errorData = await updateRiskResponse.text();
        console.error('Failed to update risk factor:', errorData);
        alert('Failed to update risk. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update risk:', error);
      alert('An error occurred while updating the risk. Please try again.');
    }
  };

  const handleDeleteRisk = async (riskId) => {
    if (!confirm('Are you sure you want to delete this risk?')) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const deleteRiskResponse = await fetch(`http://localhost:8000/api/risk-analyses/factors/${riskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (deleteRiskResponse.ok) {
        const responseData = await deleteRiskResponse.json();
        console.log('Risk deleted successfully:', responseData);
        
        // Reload risks
        loadProjectAndRisks();
        
        // Show success message
        alert('Risk deleted successfully!');
      } else {
        const errorData = await deleteRiskResponse.text();
        console.error('Failed to delete risk factor:', errorData);
        alert('Failed to delete risk. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete risk:', error);
      alert('An error occurred while deleting the risk. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="risk-analysis">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading risk analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="risk-analysis">
      {/* Header */}
      <div className="analysis-header">
        <div className="header-content">
          <h1>Risk Analysis</h1>
          <p>Project: {project?.name}</p>
        </div>
        <div className="header-actions">
          <Link to={`/project/${id}`} className="btn btn-secondary">
            Back to Project
          </Link>
                     {canAddRisks() && (
             <button 
               className="btn btn-primary"
               onClick={() => setShowAddRisk(true)}
             >
               + Add Risk
             </button>
           )}
        </div>
      </div>

      {/* Risk Summary */}
      <div className="risk-summary">
        <div className="summary-card">
          <div className="summary-number">{risks.length}</div>
          <div className="summary-label">Total Risks</div>
        </div>
        <div className="summary-card high-risk">
          <div className="summary-number">
            {risks.filter(r => r.riskScore && getRiskLevel(r.riskScore).level === 'high').length}
          </div>
          <div className="summary-label">High Risk</div>
        </div>
        <div className="summary-card medium-risk">
          <div className="summary-number">
            {risks.filter(r => r.riskScore && getRiskLevel(r.riskScore).level === 'medium').length}
          </div>
          <div className="summary-label">Medium Risk</div>
        </div>
        <div className="summary-card low-risk">
          <div className="summary-number">
            {risks.filter(r => r.riskScore && getRiskLevel(r.riskScore).level === 'low').length}
          </div>
          <div className="summary-label">Low Risk</div>
        </div>
        <div className="summary-card" style={{ backgroundColor: '#f5f5f5' }}>
          <div className="summary-number">
            {risks.filter(r => !r.riskScore).length}
          </div>
          <div className="summary-label">Not Evaluated</div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="analysis-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search risks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="biological_chemical">Biological/Chemical</option>
            <option value="operational_informational">Operational/Informational</option>
            <option value="software">Software</option>
            <option value="energy_functional">Energy/Functional</option>
          </select>
        </div>
      </div>

      {/* Risk Table */}
      <div className="risk-table-container">
        <table className="risk-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Lifecycle Stage</th>
              <th>Hazard</th>
              <th>Sequence of Events</th>
              <th>Hazardous Situation</th>
              <th>Harm</th>
              <th>Risk Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRisks.map(risk => {
              const riskLevel = risk.riskScore ? getRiskLevel(risk.riskScore) : { level: 'unknown', color: '#9E9E9E' };
              return (
                <tr key={risk.id} className="risk-row">
                  <td className="category-cell">
                    {risk.hazardCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </td>
                  <td className="lifecycle-cell">
                    {risk.lifecycleStage}
                  </td>
                  <td className="hazard-cell">
                    {risk.hazardName}
                  </td>
                  <td className="sequence-cell">
                    {risk.sequenceOfEvents}
                  </td>
                  <td className="situation-cell">
                    {risk.hazardousS}
                  </td>
                  <td className="harm-cell">
                    {risk.harm}
                  </td>
                  <td className="risk-score-cell">
                    {risk.riskScore ? (
                      <span 
                        className={`risk-score ${riskLevel.level}`}
                        style={{ backgroundColor: riskLevel.color }}
                      >
                        {risk.riskScore}
                      </span>
                    ) : (
                      <span className="not-evaluated" style={{ color: '#999', fontStyle: 'italic' }}>
                        Not evaluated
                      </span>
                    )}
                  </td>
                                     <td className="actions-cell">
                     {canEditRisks() && (
                       <button 
                         className="action-btn edit"
                         onClick={() => {
                           setSelectedRisk(risk);
                           setShowEditRisk(true);
                         }}
                         title="Edit risk"
                       >
                         ✏️
                       </button>
                     )}
                     <button 
                       className="action-btn view"
                       onClick={() => {
                         const sheetMapping = {
                           'energy_functional': 'sheet1',
                           'biological_chemical': 'sheet2',
                           'operational_informational': 'sheet3',
                           'software': 'sheet4'
                         };
                         const sheetId = sheetMapping[risk.hazardCategory] || 'sheet1';
                         
                         sessionStorage.setItem('highlightRiskId', risk.id);
                         sessionStorage.setItem('openSheet', sheetId);
                         
                         navigate(`/project/${id}?openRiskTable=true&sheet=${sheetId}&riskId=${risk.id}`);
                       }}
                       title="Open in Risk Table"
                     >
                       📊
                     </button>
                   </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Risk Modal */}
      {showAddRisk && (
        <div className="modal-overlay" onClick={() => setShowAddRisk(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Risk</h2>
              <button 
                className="close-btn"
                onClick={() => setShowAddRisk(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddRisk} className="risk-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Hazard Category</label>
                  <select
                    value={newRisk.hazardCategory}
                    onChange={(e) => setNewRisk({...newRisk, hazardCategory: e.target.value})}
                    required
                  >
                    <option value="biological_chemical">Biological/Chemical</option>
                    <option value="operational_informational">Operational/Informational</option>
                    <option value="software">Software</option>
                    <option value="energy_functional">Energy/Functional</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Lifecycle Stage</label>
                  <select
                    value={newRisk.lifecycleStage}
                    onChange={(e) => setNewRisk({...newRisk, lifecycleStage: e.target.value})}
                    required
                  >
                    <option value="operation">Operation</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="storage">Storage</option>
                    <option value="transport">Transport</option>
                    <option value="disposal">Disposal</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Hazard Name</label>
                <input
                  type="text"
                  value={newRisk.hazardName}
                  onChange={(e) => setNewRisk({...newRisk, hazardName: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Sequence of Events</label>
                <textarea
                  value={newRisk.sequenceOfEvents}
                  onChange={(e) => setNewRisk({...newRisk, sequenceOfEvents: e.target.value})}
                  rows="2"
                  required
                />
              </div>

              <div className="form-group">
                <label>Hazardous Situation</label>
                <textarea
                  value={newRisk.hazardousS}
                  onChange={(e) => setNewRisk({...newRisk, hazardousS: e.target.value})}
                  rows="2"
                  required
                />
              </div>

              <div className="form-group">
                <label>Harm</label>
                <textarea
                  value={newRisk.harm}
                  onChange={(e) => setNewRisk({...newRisk, harm: e.target.value})}
                  rows="2"
                  required
                />
              </div>

              {/* Severity, Probability scores and Control Measures are now managed in the Risk Management Table */}
              <div className="info-message" style={{ 
                backgroundColor: '#E3F2FD', 
                padding: '12px', 
                borderRadius: '4px', 
                marginTop: '12px',
                fontSize: '14px',
                color: '#1976D2'
              }}>
                ℹ️ <strong>Note:</strong> Risk scores and control measures will be filled in the Risk Management Table after creating the risk.
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRisk(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Risk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Risk Modal */}
      {showEditRisk && selectedRisk && (
        <div className="modal-overlay" onClick={() => setShowEditRisk(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Risk</h2>
              <button 
                className="close-btn"
                onClick={() => setShowEditRisk(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleEditRisk} className="risk-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Hazard Category</label>
                  <select
                    value={selectedRisk.hazardCategory}
                    onChange={(e) => setSelectedRisk({...selectedRisk, hazardCategory: e.target.value})}
                    required
                  >
                    <option value="biological_chemical">Biological/Chemical</option>
                    <option value="operational_informational">Operational/Informational</option>
                    <option value="software">Software</option>
                    <option value="energy_functional">Energy/Functional</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Lifecycle Stage</label>
                  <select
                    value={selectedRisk.lifecycleStage}
                    onChange={(e) => setSelectedRisk({...selectedRisk, lifecycleStage: e.target.value})}
                    required
                  >
                    <option value="operation">Operation</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="storage">Storage</option>
                    <option value="transport">Transport</option>
                    <option value="disposal">Disposal</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Hazard Name</label>
                <input
                  type="text"
                  value={selectedRisk.hazardName}
                  onChange={(e) => setSelectedRisk({...selectedRisk, hazardName: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Sequence of Events</label>
                <textarea
                  value={selectedRisk.sequenceOfEvents}
                  onChange={(e) => setSelectedRisk({...selectedRisk, sequenceOfEvents: e.target.value})}
                  rows="2"
                  required
                />
              </div>

              <div className="form-group">
                <label>Hazardous Situation</label>
                <textarea
                  value={selectedRisk.hazardousS}
                  onChange={(e) => setSelectedRisk({...selectedRisk, hazardousS: e.target.value})}
                  rows="2"
                  required
                />
              </div>

              <div className="form-group">
                <label>Harm</label>
                <textarea
                  value={selectedRisk.harm}
                  onChange={(e) => setSelectedRisk({...selectedRisk, harm: e.target.value})}
                  rows="2"
                  required
                />
              </div>

              {/* Severity, Probability scores and Control Measures are now managed in the Risk Management Table */}
              <div className="info-message" style={{ 
                backgroundColor: '#E3F2FD', 
                padding: '12px', 
                borderRadius: '4px', 
                marginTop: '12px',
                fontSize: '14px',
                color: '#1976D2'
              }}>
                ℹ️ <strong>Note:</strong> Risk scores and control measures are managed in the Risk Management Table.
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditRisk(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Risk
                </button>
                {canDeleteRisks() && (
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={() => {
                      setShowEditRisk(false);
                      handleDeleteRisk(selectedRisk.id);
                    }}
                  >
                    🗑️ Delete Risk
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Risk Modal */}
      {showViewRisk && selectedRisk && (
        <div className="modal-overlay" onClick={() => setShowViewRisk(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>View Risk Details</h2>
              <button 
                className="close-btn"
                onClick={() => setShowViewRisk(false)}
              >
                ×
              </button>
            </div>
            
            <div className="risk-details">
              <div className="detail-row">
                <label>Hazard Category:</label>
                <span>{selectedRisk.hazardCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
              <div className="detail-row">
                <label>Lifecycle Stage:</label>
                <span>{selectedRisk.lifecycleStage}</span>
              </div>
              <div className="detail-row">
                <label>Hazard Name:</label>
                <span>{selectedRisk.hazardName}</span>
              </div>
              <div className="detail-row">
                <label>Sequence of Events:</label>
                <span>{selectedRisk.sequenceOfEvents}</span>
              </div>
              <div className="detail-row">
                <label>Hazardous Situation:</label>
                <span>{selectedRisk.hazardousS}</span>
              </div>
              <div className="detail-row">
                <label>Harm:</label>
                <span>{selectedRisk.harm}</span>
              </div>
              
              {/* Show scores if available from risk table */}
              {selectedRisk.severityScore && (
                <div className="detail-row">
                  <label>Severity Score (from Risk Table):</label>
                  <span>{selectedRisk.severityScore}</span>
                </div>
              )}
              {selectedRisk.probabilityScore && (
                <div className="detail-row">
                  <label>Probability Score (from Risk Table):</label>
                  <span>{selectedRisk.probabilityScore}</span>
                </div>
              )}
              {selectedRisk.riskScore && (
                <div className="detail-row">
                  <label>Risk Score (from Risk Table):</label>
                  <span className={`risk-score ${getRiskLevel(selectedRisk.riskScore).level}`}>
                    {selectedRisk.riskScore}
                  </span>
                </div>
              )}
              
              {!selectedRisk.severityScore && !selectedRisk.probabilityScore && (
                <div className="info-message" style={{ 
                  backgroundColor: '#FFF3E0', 
                  padding: '12px', 
                  borderRadius: '4px', 
                  marginTop: '8px',
                  fontSize: '14px',
                  color: '#E65100'
                }}>
                  ⚠️ Risk scores not yet assigned. Please evaluate this risk in the Risk Management Table.
                </div>
              )}
              <div className="detail-row">
                <label>Last Updated:</label>
                <span>{new Date(selectedRisk.lastUpdated).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  // Определяем лист по категории риска
                  const sheetMapping = {
                    'energy_functional': 'sheet1',
                    'biological_chemical': 'sheet2',
                    'operational_informational': 'sheet3',
                    'software': 'sheet4'
                  };
                  const sheetId = sheetMapping[selectedRisk.hazardCategory] || 'sheet1';
                  
                  // Сохраняем информацию о том, какой риск нужно подсветить
                  sessionStorage.setItem('highlightRiskId', selectedRisk.id);
                  sessionStorage.setItem('openSheet', sheetId);
                  
                  // Перенаправляем на страницу проекта с флагом открытия таблицы
                  navigate(`/project/${id}?openRiskTable=true&sheet=${sheetId}&riskId=${selectedRisk.id}`);
                }}
              >
                📊 Open in Risk Table
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowViewRisk(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating return button like Personal Account (hidden when any modal is open) */}
      {!showAddRisk && !showEditRisk && !showViewRisk && (
        <button
          className={`floating-return visible`}
          onClick={() => {
            const content = document.querySelector('.content-body');
            if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="Return to top"
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default RiskAnalysis;
