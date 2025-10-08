import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ExcelTable from '../components/ExcelTable';

const ProjectTable = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleClose = () => {
    navigate(`/project/${id}`);
  };

  return (
    <ExcelTable 
      projectId={id} 
      onClose={handleClose}
    />
  );
};

export default ProjectTable;
