import React, { useState } from 'react';
import './RiskMatrixTable.css';

const RiskMatrixTable = ({ onMatrixChange, initialMatrix = null }) => {
  // Default Russian risk matrix data
  const defaultMatrix = {
    severityLevels: [
      { id: 'negligible', name: 'Незначительный', description: 'Приводит к неудобству или временному дискомфорту', score: 1 },
      { id: 'minor', name: 'Незначительный/Легкий', description: 'Приводит к временному повреждению или нарушению, не требующему медицинского вмешательства', score: 2 },
      { id: 'serious', name: 'Серьезный/Значительный', description: 'Приводит к повреждению или нарушению, требующему медицинского или хирургического вмешательства', score: 3 },
      { id: 'critical', name: 'Критический', description: 'Приводит к постоянному нарушению или необратимому повреждению', score: 4 },
      { id: 'catastrophic', name: 'Катастрофический/Фатальный', description: 'Приводит к смерти', score: 5 }
    ]
  };

  const [matrix, setMatrix] = useState(initialMatrix || defaultMatrix);

  const handleCellChange = (type, index, field, value) => {
    const newMatrix = JSON.parse(JSON.stringify(matrix));

    if (type === 'severity') {
      newMatrix.severityLevels[index][field] = value;
    }

    setMatrix(newMatrix);

    if (onMatrixChange) {
      onMatrixChange(newMatrix);
    }
  };

  const renderEditableCell = (value, onChange) => {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="matrix-cell-input"
        placeholder="Введите текст..."
      />
    );
  };

  return (
    <div className="risk-matrix-table">
      <h2>Уровни тяжести последствий</h2>
      <p className="form-section-description">Настройте уровни тяжести последствий</p>

      {/* Severity Levels Table */}
      <div className="matrix-section">
        <h4></h4>
        <div className="matrix-table-container">
          <table className="severity-table">
            <thead>
              <tr>
                <th>Уровень</th>
                <th>Название</th>
                <th>Описание</th>
                <th>Балл</th>
              </tr>
            </thead>
            <tbody>
              {matrix.severityLevels.map((level, index) => (
                <tr key={level.id}>
                  <td>
                    {renderEditableCell(index + 1, (value) => handleCellChange('severity', index, 'level', value))}
                  </td>
                  <td>
                    {renderEditableCell(level.name, (value) => handleCellChange('severity', index, 'name', value))}
                  </td>
                  <td>
                    {renderEditableCell(level.description, (value) => handleCellChange('severity', index, 'description', value))}
                  </td>
                  <td>
                    {renderEditableCell(level.score, (value) => handleCellChange('severity', index, 'score', value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>






    </div>
  );
};

export default RiskMatrixTable;
