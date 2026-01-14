import React, { useState } from 'react';
import RiskEvaluationWizard from './RiskEvaluationWizard';
import './BatchRiskEvaluation.css';

/**
 * Упрощенная массовая оценка:
 * - Один экран для каждого риска
 * - Навигация по номеру риска
 * - Статусы: серый (ожидает), зеленый (сохранен), синий (текущий)
 * - Кнопки: отменить для риска, сохранить изменения (все зеленые)
 */
const BatchRiskEvaluation = ({ risks, acceptableRiskLevel, onComplete, onCancel }) => {
  const [currentRiskIndex, setCurrentRiskIndex] = useState(0);
  const [evaluations, setEvaluations] = useState({}); // { rowIndex: evaluation }

  const currentRisk = risks[currentRiskIndex];

  const handleRiskSaved = (evaluation) => {
    const rowIndex = evaluation.rowIndex;
    setEvaluations((prev) => ({
      ...prev,
      [rowIndex]: evaluation,
    }));

    // Авто-переход к следующему не сохраненному риску
    const nextIndex = risks.findIndex(
      (risk, idx) => idx > currentRiskIndex && !evaluations[risk.rowIndex] && risk.rowIndex !== rowIndex
    );
    if (nextIndex !== -1) setCurrentRiskIndex(nextIndex);
  };

  const handleNavigateToRisk = (index) => setCurrentRiskIndex(index);

  const handleCancelAll = () => onCancel();

  // Сохранить: зеленые применяются, серые откатываются
  const handleSaveAll = () => {
    const evaluationsArray = Object.values(evaluations);
    const pendingIndices = risks.filter((r) => !evaluations[r.rowIndex]).map((r) => r.rowIndex);
    onComplete(evaluationsArray, pendingIndices);
  };
  
  // Сброс изменений для текущего риска (серый индикатор)
  const resetCurrentRisk = () => {
    const rowIndex = currentRisk.rowIndex;
    setEvaluations((prev) => {
      const copy = { ...prev };
      delete copy[rowIndex];
      return copy;
    });
  };

  const getRiskStatus = (index) => {
    const risk = risks[index];
    const rowIndex = risk.rowIndex;
    if (evaluations[rowIndex]) return 'completed'; // зеленый
    if (index === currentRiskIndex) return 'current'; // синий
    return 'pending'; // серый
  };

  const getIndicatorColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'current':
        return '#2196F3';
      case 'pending':
      default:
        return '#9E9E9E';
    }
  };

  const getIndicatorIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✓';
      default:
        return '';
    }
  };

  return (
    <div className="batch-risk-evaluation modal-centered">
      {currentRisk && (
        <div className="batch-modal">
          <div className="indicators-top">
            <h4>Оценка рисков ({Object.keys(evaluations).length} из {risks.length})</h4>
            <p className="indicators-hint">
              Серый — не сохранен, зеленый — сохранен. Нажмите на номер, чтобы перейти.
            </p>
            <div className="risk-indicators">
              {risks.map((risk, index) => {
                const status = getRiskStatus(index);
                const color = getIndicatorColor(status);
                const icon = getIndicatorIcon(status);
                return (
                  <div
                    key={index}
                    className={`risk-indicator ${status}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleNavigateToRisk(index)}
                    title={
                      status === 'completed'
                        ? `Риск #${index + 1} - сохранен`
                        : status === 'current'
                        ? `Риск #${index + 1} - текущий`
                        : `Риск #${index + 1} - не сохранен`
                    }
                  >
                    {icon ? (
                      <span className="indicator-icon">{icon}</span>
                    ) : (
                      <span className="indicator-number">{index + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="work-area">
            <div className="wizard-center">
              <RiskEvaluationWizard
                risk={currentRisk}
                evaluationType={currentRisk.evaluationType}
                acceptableRiskLevel={acceptableRiskLevel}
                onSaveRisk={handleRiskSaved}
                currentEvaluation={evaluations[currentRisk.rowIndex]}
                extraActionsLeft={
                  <>
                    <button className="bre-btn bre-btn-secondary" onClick={resetCurrentRisk}>
                      ↺ Сбросить изменения риска
                    </button>
                  </>
                }
                extraActionsRight={
                  <button
                    className="bre-btn bre-btn-success"
                    onClick={handleSaveAll}
                    title="Сохранить все зеленые риски. Серые будут восстановлены."
                  >
                    💾 Сохранить все риски
                    {Object.keys(evaluations).length > 0 && ` (${Object.keys(evaluations).length})`}
                  </button>
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchRiskEvaluation;
