import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProjectForm.css';

const ProjectForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id && id !== 'new');
  
  const [formData, setFormData] = useState({
    // Basic Project Info
    name: '',
    description: '',
    status: 'draft',
    
    // Device Information
    deviceName: '',
    deviceModel: '',
    devicePurpose: '',
    deviceDescription: '',
    deviceClassification: '',
    intendedUse: '',
    userProfile: '',
    operatingEnvironment: '',
    
    // Technical Specifications
    technicalSpecs: '',
    regulatoryRequirements: '',
    standards: '',
    
    // Risk Assessment Parameters
    contactType: 'no_contact',
    duration: 'temporary',
    invasiveness: 'non_invasive',
    energySource: 'none',
    
    // Team Assignment
    projectLead: '',
    teamMembers: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadCurrentUser();
    loadAvailableUsers();
    if (isEditMode) {
      loadProjectData();
    }
  }, [id, isEditMode]);

  const loadCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const usersData = await response.json();
        // Преобразуем в формат для селекта
        const formattedUsers = usersData
          .filter(user => user.is_active) // Только активные пользователи
          .map(user => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`.trim() || user.email,
            email: user.email,
            role: user.role
          }));
        setAvailableUsers(formattedUsers);
      } else {
        console.error('Failed to load users:', response.status);
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setAvailableUsers([]);
    }
  };

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const projectData = await response.json();
        
        // Load project members
        const membersResponse = await fetch(`http://localhost:8000/api/projects/${id}/members`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        let projectLead = '';
        let teamMembers = [];
        
        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          teamMembers = membersData
            .filter(member => member.role !== 'owner')
            .map(member => member.user_id.toString());
          
          // Set project lead (first member or owner)
          const leadMember = membersData.find(member => member.role === 'owner') || membersData[0];
          if (leadMember) {
            projectLead = leadMember.user_id.toString();
          }
        }
        
        setFormData({
          name: projectData.name || '',
          description: projectData.description || '',
          status: projectData.status || 'draft',
          deviceName: projectData.device_name || '',
          deviceModel: projectData.device_model || '',
          devicePurpose: projectData.device_purpose || '',
          deviceDescription: projectData.device_description || '',
          deviceClassification: projectData.device_classification || '',
          intendedUse: projectData.intended_use || '',
          userProfile: projectData.user_profile || '',
          operatingEnvironment: projectData.operating_environment || '',
          technicalSpecs: projectData.technical_specs || '',
          regulatoryRequirements: projectData.regulatory_requirements || '',
          standards: projectData.standards || '',
          contactType: projectData.contact_type || 'no_contact',
          duration: projectData.duration || 'temporary',
          invasiveness: projectData.invasiveness || 'non_invasive',
          energySource: projectData.energy_source || 'none',
          projectLead: projectLead,
          teamMembers: teamMembers
        });
      } else {
        setError('Failed to load project data');
      }
    } catch (err) {
      setError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTeamMemberChange = (userId, isSelected) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: isSelected
        ? [...prev.teamMembers, userId]
        : prev.teamMembers.filter(id => id !== userId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.name || !formData.deviceName || !formData.devicePurpose) {
        throw new Error('Please fill in all required fields');
      }

      const token = localStorage.getItem('token');
      const url = isEditMode 
        ? `http://localhost:8000/api/projects/${id}`
        : 'http://localhost:8000/api/projects/';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          device_name: formData.deviceName,
          device_model: formData.deviceModel,
          device_purpose: formData.devicePurpose,
          device_description: formData.deviceDescription,
          device_classification: formData.deviceClassification,
          intended_use: formData.intendedUse,
          user_profile: formData.userProfile,
          operating_environment: formData.operatingEnvironment,
          technical_specs: formData.technicalSpecs,
          regulatory_requirements: formData.regulatoryRequirements,
          standards: formData.standards,
          contact_type: formData.contactType,
          duration: formData.duration,
          invasiveness: formData.invasiveness,
          energy_source: formData.energySource,
          status: formData.status
        })
      });

      if (response.ok) {
        const projectData = await response.json();
        
        if (isEditMode) {
          // For edit mode, first get current members and remove those not selected
          const currentMembersResponse = await fetch(`http://localhost:8000/api/projects/${id}/members`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (currentMembersResponse.ok) {
            const currentMembers = await currentMembersResponse.json();
            const currentMemberIds = currentMembers
              .filter(member => member.role !== 'owner')
              .map(member => member.user_id.toString());
            
            // Remove members that are no longer selected
            for (const memberId of currentMemberIds) {
              if (!formData.teamMembers.includes(memberId)) {
                try {
                  await fetch(`http://localhost:8000/api/projects/${id}/members/${memberId}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                } catch (error) {
                  console.error(`Error removing user ${memberId} from project:`, error);
                }
              }
            }
          }
        }
        
        // Add new team members
        for (const userId of formData.teamMembers) {
          try {
            const memberResponse = await fetch(`http://localhost:8000/api/projects/${projectData.id}/members`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user_id: userId,
                role: 'member'
              })
            });
            
            if (!memberResponse.ok) {
              console.warn(`Failed to add user ${userId} to project`);
            }
          } catch (error) {
            console.error(`Error adding user ${userId} to project:`, error);
          }
        }
        
        navigate(`/project/${projectData.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save project');
      }
      
    } catch (err) {
      setError(err.message || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  // Все пользователи могут создавать проекты

  // Проверки доступа для редактирования происходят на backend

  if (loading && isEditMode) {
    return (
      <div className="project-form">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-form">
      <div className="form-header">
        <h1>{isEditMode ? 'Edit Project' : 'Create New Project'}</h1>
        <p>{isEditMode ? 'Update project information and settings' : 'Set up a new medical device risk analysis project'}</p>
      </div>

      <form onSubmit={handleSubmit} className="form">
        {/* Basic Information Section */}
        <div className="form-section">
          <h2>Basic Information</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Project Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter project name"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="draft">Draft</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Under Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Project Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the project goals and scope"
              rows="3"
            />
          </div>
        </div>

        {/* Device Information Section */}
        <div className="form-section">
          <h2>Device Information</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="deviceName">Device Name *</label>
              <input
                type="text"
                id="deviceName"
                name="deviceName"
                value={formData.deviceName}
                onChange={handleInputChange}
                placeholder="Enter device name"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="deviceModel">Device Model</label>
              <input
                type="text"
                id="deviceModel"
                name="deviceModel"
                value={formData.deviceModel}
                onChange={handleInputChange}
                placeholder="Enter model number"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="devicePurpose">Device Purpose *</label>
            <textarea
              id="devicePurpose"
              name="devicePurpose"
              value={formData.devicePurpose}
              onChange={handleInputChange}
              placeholder="Describe the intended purpose of the device"
              rows="2"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="deviceDescription">Device Description</label>
            <textarea
              id="deviceDescription"
              name="deviceDescription"
              value={formData.deviceDescription}
              onChange={handleInputChange}
              placeholder="Provide detailed description of the device"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="deviceClassification">Device Classification</label>
              <select
                id="deviceClassification"
                name="deviceClassification"
                value={formData.deviceClassification}
                onChange={handleInputChange}
              >
                <option value="">Select classification</option>
                <option value="Class I">Class I</option>
                <option value="Class IIa">Class IIa</option>
                <option value="Class IIb">Class IIb</option>
                <option value="Class III">Class III</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="intendedUse">Intended Use</label>
              <input
                type="text"
                id="intendedUse"
                name="intendedUse"
                value={formData.intendedUse}
                onChange={handleInputChange}
                placeholder="Where will the device be used?"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="userProfile">User Profile</label>
              <input
                type="text"
                id="userProfile"
                name="userProfile"
                value={formData.userProfile}
                onChange={handleInputChange}
                placeholder="Who will use the device?"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="operatingEnvironment">Operating Environment</label>
              <input
                type="text"
                id="operatingEnvironment"
                name="operatingEnvironment"
                value={formData.operatingEnvironment}
                onChange={handleInputChange}
                placeholder="Operating environment conditions"
              />
            </div>
          </div>
        </div>

        {/* Technical Specifications Section */}
        <div className="form-section">
          <h2>Technical Specifications</h2>
          
          <div className="form-group">
            <label htmlFor="technicalSpecs">Technical Specifications</label>
            <textarea
              id="technicalSpecs"
              name="technicalSpecs"
              value={formData.technicalSpecs}
              onChange={handleInputChange}
              placeholder="Key technical specifications and features"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="regulatoryRequirements">Regulatory Requirements</label>
            <textarea
              id="regulatoryRequirements"
              name="regulatoryRequirements"
              value={formData.regulatoryRequirements}
              onChange={handleInputChange}
              placeholder="Applicable regulatory requirements (FDA, CE, etc.)"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label htmlFor="standards">Applicable Standards</label>
            <textarea
              id="standards"
              name="standards"
              value={formData.standards}
              onChange={handleInputChange}
              placeholder="Relevant industry standards (ISO, IEC, etc.)"
              rows="2"
            />
          </div>
        </div>

        {/* Risk Assessment Parameters Section */}
        <div className="form-section">
          <h2>Risk Assessment Parameters</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contactType">Contact Type</label>
              <select
                id="contactType"
                name="contactType"
                value={formData.contactType}
                onChange={handleInputChange}
              >
                <option value="no_contact">No Contact</option>
                <option value="indirect_contact">Indirect Contact</option>
                <option value="surface_contact">Surface Contact</option>
                <option value="external_communicating">External Communicating</option>
                <option value="implantable">Implantable</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="duration">Duration of Contact</label>
              <select
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
              >
                <option value="temporary">Temporary (≤ 24h)</option>
                <option value="short_term">Short Term (24h - 30 days)</option>
                <option value="long_term">Long Term (> 30 days)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="invasiveness">Invasiveness</label>
              <select
                id="invasiveness"
                name="invasiveness"
                value={formData.invasiveness}
                onChange={handleInputChange}
              >
                <option value="non_invasive">Non-invasive</option>
                <option value="invasive">Invasive</option>
                <option value="active_implantable">Active Implantable</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="energySource">Energy Source</label>
              <select
                id="energySource"
                name="energySource"
                value={formData.energySource}
                onChange={handleInputChange}
              >
                <option value="none">None</option>
                <option value="electrical">Electrical</option>
                <option value="mechanical">Mechanical</option>
                <option value="thermal">Thermal</option>
                <option value="chemical">Chemical</option>
                <option value="radioactive">Radioactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Team Assignment Section */}
        <div className="form-section">
          <h2>Team Assignment</h2>
          
          <div className="form-group">
            <label htmlFor="projectLead">Project Lead</label>
            <select
              id="projectLead"
              name="projectLead"
              value={formData.projectLead}
              onChange={handleInputChange}
            >
              <option value="">Select project lead</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id.toString()}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Team Members</label>
            <div className="team-selection">
                {availableUsers.map(user => (
                  <label key={user.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.teamMembers.includes(user.id.toString())}
                      onChange={(e) => handleTeamMemberChange(user.id.toString(), e.target.checked)}
                    />
                    <span>{user.name} ({user.email})</span>
                  </label>
                ))}
              </div>
            </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Form Actions */}
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEditMode ? 'Update Project' : 'Create Project')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
