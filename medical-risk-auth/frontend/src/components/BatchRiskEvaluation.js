import React, { useState } from 'react';
import RiskEvaluationWizard from './RiskEvaluationWizard';
import './BatchRiskEvaluation.css';

/**
 * BatchRiskEvaluation - Компонент для массовой оценки рисков
 * 
 * Новый подход:
 * - Индикаторы рисков (кружочки) снизу wizard
 * - Свободная навигация между рисками
 * - Возможность отмены оценки
 * - Финальная кнопка "Сохранить все изменения"
 */
const BatchRiskEvaluation = ({ risks, onComplete, onCancel }) => {
  const [currentRiskIndex, setCurrentRiskIndex] = useState(0);
  const [evaluations, setEvaluations] = useState({}); // { riskIndex: evaluation }
  const [cancelledRisks, setCancelledRisks] = useState(new Set()); // Отмененные оценки

  // Текущий риск для оценки
  const currentRisk = risks[currentRiskIndex];
  
  // Проверка, оценены ли все риски (кроме отмененных)
  const allEvaluated = risks.every((risk, index) => {
    return cancelledRisks.has(index) || evaluations[index];
  });

  // Обработка завершения оценки текущего риска
  const handleRiskEvaluated = (evaluation) => {
    const newEvaluations = {
      ...evaluations,
      [currentRiskIndex]: evaluation
    };
    setEvaluations(newEvaluations);
    
    // Удаляем из отмененных, если был отменен ранее
    const newCancelled = new Set(cancelledRisks);
    newCancelled.delete(currentRiskIndex);
    setCancelledRisks(newCancelled);
  };

  // Отмена оценки текущего риска (помечаем как отмененный)
  const handleCancelCurrentRisk = () => {
    if (window.confirm('Отменить оценку этого риска? При сохранении этот риск будет пропущен.')) {
      // Удаляем оценку если была
      const newEvaluations = { ...evaluations };
      delete newEvaluations[currentRiskIndex];
      setEvaluations(newEvaluations);
      
      // Добавляем в отмененные
      const newCancelled = new Set(cancelledRisks);
      newCancelled.add(currentRiskIndex);
      setCancelledRisks(newCancelled);
      
      // Переходим к следующему не отмененному риску
      const nextIndex = risks.findIndex((_, idx) => 
        idx > currentRiskIndex && !newCancelled.has(idx)
      );
      
      if (nextIndex !== -1) {
        setCurrentRiskIndex(nextIndex);
      } else {
        // Если все последующие отменены, ищем с начала
        const firstAvailable = risks.findIndex((_, idx) => !newCancelled.has(idx));
        if (firstAvailable !== -1) {
          setCurrentRiskIndex(firstAvailable);
        }
      }
    }
  };
  
  // Выход из wizard без сохранения (просто закрыть wizard)
  const handleCancelWizard = () => {
    // Не сохраняем текущую оценку, просто выходим
    // Можно добавить подтверждение если что-то изменено
  };

  // Переход к конкретному риску
  const handleNavigateToRisk = (index) => {
    setCurrentRiskIndex(index);
  };

  // Отмена всего процесса
  const handleCancelAll = () => {
    const evaluatedCount = Object.keys(evaluations).length;
    if (evaluatedCount > 0) {
      const confirmed = window.confirm(
        `Вы оценили ${evaluatedCount} из ${risks.length} рисков. ` +
        'При отмене все несохраненные оценки будут потеряны. Продолжить?'
      );
      if (!confirmed) return;
    }
    onCancel();
  };

  // Сохранение всех изменений
  const handleSaveAll = () => {
    // Формируем массив оценок (только для не отмененных рисков)
    const evaluationsArray = [];
    Object.entries(evaluations).forEach(([index, evaluation]) => {
      if (!cancelledRisks.has(parseInt(index))) {
        evaluationsArray.push(evaluation);
      }
    });
    
    onComplete(evaluationsArray);
  };

  // Получить статус риска
  const getRiskStatus = (index) => {
    if (cancelledRisks.has(index)) {
      return 'cancelled';
    }
    if (evaluations[index]) {
      return 'completed';
    }
    if (index === currentRiskIndex) {
      return 'current';
    }
    return 'pending';
  };

  // Получить цвет индикатора
  const getIndicatorColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50'; // Зеленый
      case 'current': return '#2196F3'; // Синий
      case 'cancelled': return '#9E9E9E'; // Серый
      case 'pending': return '#E0E0E0'; // Светло-серый
      default: return '#E0E0E0';
    }
  };

  // Получить иконку индикатора
  const getIndicatorIcon = (status) => {
    switch (status) {
      case 'completed': return '✓';
      case 'cancelled': return '✗';
      default: return '';
    }
  };

  return (
    <div className="batch-risk-evaluation">
      {/* Wizard для текущего риска */}
      {currentRisk && !cancelledRisks.has(currentRiskIndex) && (
        <div className="batch-wizard-wrapper">
          <RiskEvaluationWizard
            risk={currentRisk}
            evaluationType={currentRisk.evaluationType}
            onComplete={handleRiskEvaluated}
            onCancel={handleCancelWizard}
            showCancelButton={false}
            onCancelRisk={handleCancelCurrentRisk}
          />
          
          {/* Индикаторы рисков внизу wizard */}
          <div className="batch-indicators-overlay">
            <div className="batch-indicators-container">
              {/* Заголовок */}
              <div className="indicators-header">
                <h4>Оценка рисков ({Object.keys(evaluations).length - cancelledRisks.size} из {risks.length})</h4>
              </div>
              
              {/* Индикаторы */}
              <div className="risk-indicators">
                {risks.map((risk, index) => {
                  const status = getRiskStatus(index);
                  const color = getIndicatorColor(status);
                  const icon = getIndicatorIcon(status);
                  
                  return (
                    <div
                      key={index}
                      className={`risk-indicator ${status}`}
                      style={{ 
                        backgroundColor: color,
                        cursor: status === 'cancelled' ? 'not-allowed' : 'pointer'
                      }}
                      onClick={() => {
                        if (status !== 'cancelled') {
                          handleNavigateToRisk(index);
                        }
                      }}
                      title={
                        status === 'completed' ? `Риск #${index + 1} - Оценен` :
                        status === 'current' ? `Риск #${index + 1} - Текущий` :
                        status === 'cancelled' ? `Риск #${index + 1} - Оценка отменена` :
                        `Риск #${index + 1} - Не оценен`
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
              
              {/* Кнопки действий */}
              <div className="indicators-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelAll}
                >
                  Отменить все
                </button>
                
                <button
                  className="btn btn-success"
                  onClick={handleSaveAll}
                  disabled={!allEvaluated}
                  title={
                    allEvaluated 
                      ? 'Сохранить все оценки' 
                      : 'Необходимо оценить или отменить все риски'
                  }
                >
                  💾 Сохранить все изменения
                  {Object.keys(evaluations).length > 0 && 
                    ` (${Object.keys(evaluations).length - cancelledRisks.size})`
                  }
                </button>
              </div>
              
              {/* Легенда */}
              <div className="indicators-legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#2196F3' }}></div>
                  <span>Текущий</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}>✓</div>
                  <span>Оценен</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#E0E0E0' }}></div>
                  <span>Не оценен</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#9E9E9E' }}>✗</div>
                  <span>Отменен</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Если текущий риск отменен, показываем заглушку */}
      {cancelledRisks.has(currentRiskIndex) && (
        <div className="cancelled-risk-placeholder">
          <div className="placeholder-content">
            <h2>Оценка риска #{currentRiskIndex + 1} отменена</h2>
            <p>Выберите другой риск для оценки из индикаторов ниже</p>
            
            {/* Те же индикаторы */}
            <div className="batch-indicators-container">
              <div className="indicators-header">
                <h4>Оценка рисков ({Object.keys(evaluations).length - cancelledRisks.size} из {risks.length})</h4>
                <p style={{ fontSize: '13px', color: '#666', margin: '5px 0 0 0', textAlign: 'center' }}>
                  Вы можете изменить любую оценку до финального сохранения
                </p>
              </div>
              
              <div className="risk-indicators">
                {risks.map((risk, index) => {
                  const status = getRiskStatus(index);
                  const color = getIndicatorColor(status);
                  const icon = getIndicatorIcon(status);
                  
                  return (
                    <div
                      key={index}
                      className={`risk-indicator ${status}`}
                      style={{ 
                        backgroundColor: color,
                        cursor: status === 'cancelled' ? 'not-allowed' : 'pointer'
                      }}
                      onClick={() => {
                        if (status !== 'cancelled') {
                          handleNavigateToRisk(index);
                        }
                      }}
                      title={
                        status === 'completed' ? `Риск #${index + 1} - Оценен` :
                        status === 'current' ? `Риск #${index + 1} - Текущий` :
                        status === 'cancelled' ? `Риск #${index + 1} - Оценка отменена` :
                        `Риск #${index + 1} - Не оценен`
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
              
              <div className="indicators-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelAll}
                >
                  Отменить все
                </button>
                
                <button
                  className="btn btn-success"
                  onClick={handleSaveAll}
                  disabled={!allEvaluated}
                >
                  💾 Сохранить все изменения
                  {Object.keys(evaluations).length > 0 && 
                    ` (${Object.keys(evaluations).length - cancelledRisks.size})`
                  }
                </button>
              </div>
              
              <div className="indicators-legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#2196F3' }}></div>
                  <span>Текущий</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}>✓</div>
                  <span>Оценен</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#E0E0E0' }}></div>
                  <span>Не оценен</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#9E9E9E' }}>✗</div>
                  <span>Отменен</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchRiskEvaluation;
