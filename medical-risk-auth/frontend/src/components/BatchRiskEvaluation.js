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
const BatchRiskEvaluation = ({ risks, acceptableRiskLevel, onComplete, onCancel, onSaveAllChanges }) => {
  const [currentRiskIndex, setCurrentRiskIndex] = useState(0);
  const [evaluations, setEvaluations] = useState({}); // { riskIndex: evaluation }
  const [cancelledRisks, setCancelledRisks] = useState(new Set()); // Отмененные оценки

  // Текущий риск для оценки
  const currentRisk = risks[currentRiskIndex];
  
  // Проверка, оценены ли все риски (кроме отмененных)
  const allEvaluated = risks.every((risk, index) => {
    return cancelledRisks.has(risk.rowIndex) || evaluations[risk.rowIndex];
  });

  // Обработка завершения оценки текущего риска
  const handleRiskEvaluated = (evaluation) => {
    const currentRisk = risks[currentRiskIndex];
    const rowIndex = currentRisk.rowIndex;

    // Сохраняем оценку по rowIndex (реальный индекс в таблице)
    const newEvaluations = {
      ...evaluations,
      [rowIndex]: evaluation
    };
    setEvaluations(newEvaluations);

    // Удаляем из отмененных, если был отменен ранее
    const newCancelled = new Set(cancelledRisks);
    newCancelled.delete(rowIndex);
    setCancelledRisks(newCancelled);

    // Автоматически переходим к следующему неоцененному риску
    const nextIndex = risks.findIndex((risk, idx) =>
      idx > currentRiskIndex &&
      !newCancelled.has(risks[idx].rowIndex) &&
      !newEvaluations[risks[idx].rowIndex]
    );

    if (nextIndex !== -1) {
      // Есть следующий риск для оценки - переходим к нему
      setCurrentRiskIndex(nextIndex);
    }
    // Если нет следующего риска, остаемся на текущем - пользователь должен явно сохранить или отменить
  };

  // Отмена оценки текущего риска (помечаем как отмененный)
  const handleCancelCurrentRisk = () => {
    if (window.confirm('Отменить оценку этого риска? При сохранении этот риск будет пропущен.')) {
      const currentRisk = risks[currentRiskIndex];
      const rowIndex = currentRisk.rowIndex; // Реальный индекс в таблице данных
      
      // Удаляем оценку если была
      const newEvaluations = { ...evaluations };
      delete newEvaluations[rowIndex]; // Используем rowIndex
      setEvaluations(newEvaluations);
      
      // Добавляем в отмененные (по rowIndex!)
      const newCancelled = new Set(cancelledRisks);
      newCancelled.add(rowIndex);
      setCancelledRisks(newCancelled);
      
      // Переходим к следующему не отмененному риску
      const nextIndex = risks.findIndex((_, idx) => 
        idx > currentRiskIndex && !newCancelled.has(risks[idx].rowIndex)
      );
      
      if (nextIndex !== -1) {
        setCurrentRiskIndex(nextIndex);
      } else {
        // Если все последующие отменены, ищем с начала
        const firstAvailable = risks.findIndex((_, idx) => !newCancelled.has(risks[idx].rowIndex));
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
    
    // Передаем и отмененные риски, чтобы очистить их данные
    onComplete(evaluationsArray, Array.from(cancelledRisks));
  };

  // Получить статус риска (index - индекс в массиве risks)
  const getRiskStatus = (index) => {
    const risk = risks[index];
    const rowIndex = risk.rowIndex;
    
    if (cancelledRisks.has(rowIndex)) {
      return 'cancelled';
    }
    if (evaluations[rowIndex]) {
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
      {currentRisk && !cancelledRisks.has(currentRisk.rowIndex) && (
        <div className="batch-wizard-wrapper">
          <RiskEvaluationWizard
            risk={currentRisk}
            evaluationType={currentRisk.evaluationType}
            onComplete={handleRiskEvaluated}
            onCancel={handleCancelWizard}
            showCancelButton={false}
            onCancelRisk={handleCancelCurrentRisk}
            acceptableRiskLevel={acceptableRiskLevel}
            onSaveAllChanges={onSaveAllChanges}
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
      {currentRisk && cancelledRisks.has(currentRisk.rowIndex) && (
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
