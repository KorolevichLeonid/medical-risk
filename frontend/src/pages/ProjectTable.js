import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './ProjectTable.css';

const ProjectTable = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
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

          let teamMembers = [];
          if (membersResponse.ok) {
            const membersData = await membersResponse.json();
            teamMembers = membersData.map(member => ({
              id: member.user_id,
              name: `${member.user_first_name} ${member.user_last_name}`,
              role: member.role,
              email: member.user_email
            }));
          }

          setProject({
            ...projectData,
            team: teamMembers
          });
        } else {
          console.error('Failed to load project:', response.status);
          if (response.status === 403) {
            alert('You do not have access to this project');
            navigate('/dashboard');
          } else {
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error('Failed to load project:', error);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, navigate]);

  // Convert project data to table rows
  const getProjectRows = () => {
    if (!project) return [];

    return [
      // Basic Project Info
      { section: 'Basic Information', field: 'Project Name', value: project.name },
      { section: 'Basic Information', field: 'Description', value: project.description },
      { section: 'Basic Information', field: 'Status', value: project.status },
      { section: 'Basic Information', field: 'Created Date', value: new Date(project.created_at).toLocaleDateString() },
      { section: 'Basic Information', field: 'Updated Date', value: new Date(project.updated_at).toLocaleDateString() },

      // Device Information
      { section: 'Device Information', field: 'Device Name', value: project.device_name },
      { section: 'Device Information', field: 'Device Model', value: project.device_model },
      { section: 'Device Information', field: 'Purpose', value: project.device_purpose },
      { section: 'Device Information', field: 'Description', value: project.device_description },
      { section: 'Device Information', field: 'Classification', value: project.device_classification },
      { section: 'Device Information', field: 'Intended Use', value: project.intended_use },
      { section: 'Device Information', field: 'User Profile', value: project.user_profile },
      { section: 'Device Information', field: 'Operating Environment', value: project.operating_environment },

      // Technical Specifications
      { section: 'Technical Specifications', field: 'Technical Specs', value: project.technical_specs },
      { section: 'Technical Specifications', field: 'Regulatory Requirements', value: project.regulatory_requirements },
      { section: 'Technical Specifications', field: 'Applicable Standards', value: project.standards },

      // Risk Assessment Parameters
      { section: 'Risk Parameters', field: 'Contact Type', value: project.contact_type },
      { section: 'Risk Parameters', field: 'Duration', value: project.duration },
      { section: 'Risk Parameters', field: 'Invasiveness', value: project.invasiveness },
      { section: 'Risk Parameters', field: 'Energy Source', value: project.energy_source }
    ];
  };

  const projectRows = getProjectRows();

  if (loading) {
    return (
      <div className="project-table">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading project data...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-table">
        <div className="error-state">
          <h2>Project not found</h2>
          <p>The requested project could not be found.</p>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="project-table">
      <div className="table-header">
        <h1>Project Data - {project.name}</h1>
        <div className="header-actions">
          <Link to={`/project/${project.id}`} className="btn btn-secondary">
            View Project
          </Link>
          <Link to={`/project/${project.id}/edit`} className="btn btn-primary">
            Edit Project
          </Link>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {projectRows.map((row, index) => (
              <tr key={index}>
                <td className="section-cell">
                  {index === 0 || row.section !== projectRows[index - 1].section ? row.section : ''}
                </td>
                <td className="field-cell">{row.field}</td>
                <td className="value-cell">
                  {row.value || <span className="empty-value">(empty)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Team Members Section */}
      {project.team && project.team.length > 0 && (
        <div className="team-section">
          <h2>Project Team</h2>
          <div className="table-container">
            <table className="data-table team-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {project.team.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td className="role-cell">
                      {member.role === 'admin' && 'Project Admin'}
                      {member.role === 'manager' && 'Manager'}
                      {member.role === 'doctor' && 'Doctor'}
                      {member.role === 'owner' && 'Owner'}
                    </td>
                    <td>{member.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating return button */}
      <button
        className="floating-return"
        onClick={() => {
          const content = document.querySelector('.content-body');
          if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Return to top"
      >
        ↑
      </button>
    </div>
  );
};

export default ProjectTable;
