import React, { useState, useEffect } from 'react';
import './RiskEvaluationWizard.css';

/**
 * RiskEvaluationWizard - Wizard для оценки одного риска
 * 
 * Используется для первичной или вторичной оценки рисков.
 * Включает шаги:
 * 1. Выбор допустимости риска (Доп/Не доп)
 * 2. Дополнительные действия (закрытие риска / комментарий / новый риск)
 * 3. Подтверждение
 */
const RiskEvaluationWizard = ({ 
  risk, 
  evaluationType, // 'first' или 'second'
  onComplete, 
  onCancel,
  showCancelButton = true, // Показывать ли кнопку "Отменить"
  onCancelRisk // Отмена оценки ЭТОГО риска (помечает как отмененный)
}) => {
  const [step, setStep] = useState(1);
  const [evaluation, setEvaluation] = useState({
    isAcceptable: null, // true = Доп, false = Не доп
    shouldCloseRisk: false, // только для первичной оценки если Доп
    comment: '', // обязательный для Не доп
    shouldCreateNewRisk: false, // только для вторичной оценки если Не доп
    newRiskDescription: '', // описание нового риска
  });

  const [errors, setErrors] = useState({});

  // Сброс state при смене риска
  useEffect(() => {
    setStep(1);
    setEvaluation({
      isAcceptable: null,
      shouldCloseRisk: false,
      comment: '',
      shouldCreateNewRisk: false,
      newRiskDescription: '',
    });
    setErrors({});
  }, [risk.id, risk.rowIndex]); // Сбрасываем при изменении ID или индекса риска

  // Определяем какие столбцы оцениваются
  const isFirstEvaluation = evaluationType === 'first';
  const riskScore = isFirstEvaluation ? risk.risk_score : risk.residual_risk_score;
  const severityScore = isFirstEvaluation ? risk.severity_score : risk.residual_risk_level;
  const probabilityScore = isFirstEvaluation ? risk.probability_score : risk.residual_probability;

  // Шаг 1: Выбор допустимости
  const renderStep1 = () => (
    <div className="wizard-step">
      <h3>Оценка допустимости риска</h3>
      
      <div className="risk-info-card">
        <div className="risk-info-row">
          <span className="label">Риск:</span>
          <span className="value">{risk.hazard_name || 'Без названия'}</span>
        </div>
        <div className="risk-info-row">
          <span className="label">Категория:</span>
          <span className="value">{risk.hazard_category || 'Не указана'}</span>
        </div>
        <div className="risk-info-row">
          <span className="label">Тяжесть вреда:</span>
          <span className="value score">{severityScore || 'Не оценено'}</span>
        </div>
        <div className="risk-info-row">
          <span className="label">Вероятность:</span>
          <span className="value score">{probabilityScore || 'Не оценено'}</span>
        </div>
        <div className="risk-info-row">
          <span className="label">Итоговый балл:</span>
          <span className={`value score-result ${getRiskLevelClass(riskScore)}`}>
            {riskScore || 'Не рассчитано'}
          </span>
        </div>
      </div>

      <div className="evaluation-choice">
        <p className="choice-question">
          Является ли данный риск допустимым?
        </p>
        
        <div className="choice-buttons">
          <button
            className={`choice-btn acceptable ${evaluation.isAcceptable === true ? 'selected' : ''}`}
            onClick={() => setEvaluation({ ...evaluation, isAcceptable: true })}
          >
            <span className="icon">✓</span>
            <span className="text">Допустимый</span>
          </button>
          
          <button
            className={`choice-btn not-acceptable ${evaluation.isAcceptable === false ? 'selected' : ''}`}
            onClick={() => setEvaluation({ ...evaluation, isAcceptable: false })}
          >
            <span className="icon">✗</span>
            <span className="text">Не допустимый</span>
          </button>
        </div>
        
        {errors.isAcceptable && (
          <div className="error-message">{errors.isAcceptable}</div>
        )}
      </div>
    </div>
  );

  // Шаг 2: Дополнительные действия
  const renderStep2 = () => {
    // Первичная оценка + Доп
    if (isFirstEvaluation && evaluation.isAcceptable === true) {
      return (
        <div className="wizard-step">
          <h3>Закрытие риска</h3>
          <p className="step-description">
            Риск оценен как <strong className="acceptable-text">допустимый</strong>.
          </p>
          
          <div className="close-risk-option">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={evaluation.shouldCloseRisk}
                onChange={(e) => setEvaluation({ ...evaluation, shouldCloseRisk: e.target.checked })}
              />
              <span className="checkbox-text">
                Закрыть риск (дальнейшая работа не требуется)
              </span>
            </label>
            
            <div className="info-box">
              <strong>ℹ️ Важно:</strong> При закрытии риска все поля будут заблокированы для редактирования,
              включая меры контроля. Закрытие нельзя отменить.
            </div>
          </div>
        </div>
      );
    }
    
    // Первичная оценка + Не доп (требуется комментарий)
    if (isFirstEvaluation && evaluation.isAcceptable === false) {
      return (
        <div className="wizard-step">
          <h3>Комментарий к риску</h3>
          <p className="step-description">
            Риск оценен как <strong className="not-acceptable-text">не допустимый</strong>.
            Необходимо оставить комментарий.
          </p>
          
          <div className="comment-section">
            <label className="form-label">Комментарий (обязательно):</label>
            <textarea
              className="form-textarea"
              rows="4"
              placeholder="Опишите причины и планируемые меры по управлению риском..."
              value={evaluation.comment}
              onChange={(e) => setEvaluation({ ...evaluation, comment: e.target.value })}
            />
            {errors.comment && (
              <div className="error-message">{errors.comment}</div>
            )}
          </div>
        </div>
      );
    }
    
    // Вторичная оценка + Доп (без дополнительных действий)
    if (!isFirstEvaluation && evaluation.isAcceptable === true) {
      return (
        <div className="wizard-step">
          <h3>Остаточный риск допустим</h3>
          <p className="step-description">
            Остаточный риск оценен как <strong className="acceptable-text">допустимый</strong>.
          </p>
          <div className="success-box">
            ✓ Риск успешно обработан. Все меры по управлению приняты.
          </div>
        </div>
      );
    }
    
    // Вторичная оценка + Не доп (комментарий + новый риск)
    if (!isFirstEvaluation && evaluation.isAcceptable === false) {
      return (
        <div className="wizard-step">
          <h3>Остаточный риск не допустим</h3>
          <p className="step-description">
            Остаточный риск оценен как <strong className="not-acceptable-text">не допустимый</strong>.
          </p>
          
          {/* Комментарий */}
          <div className="comment-section">
            <label className="form-label">Комментарий (обязательно):</label>
            <textarea
              className="form-textarea"
              rows="3"
              placeholder="Опишите причины недостаточности мер управления..."
              value={evaluation.comment}
              onChange={(e) => setEvaluation({ ...evaluation, comment: e.target.value })}
            />
            {errors.comment && (
              <div className="error-message">{errors.comment}</div>
            )}
          </div>
          
          {/* Новый риск */}
          <div className="new-risk-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={evaluation.shouldCreateNewRisk}
                onChange={(e) => setEvaluation({ 
                  ...evaluation, 
                  shouldCreateNewRisk: e.target.checked,
                  newRiskDescription: e.target.checked ? evaluation.newRiskDescription : ''
                })}
              />
              <span className="checkbox-text">
                Возникли новые риски при применении мер управления
              </span>
            </label>
            
            {evaluation.shouldCreateNewRisk && (
              <div className="new-risk-input">
                <label className="form-label">Описание нового риска:</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Опишите новый риск, возникший при применении мер управления..."
                  value={evaluation.newRiskDescription}
                  onChange={(e) => setEvaluation({ ...evaluation, newRiskDescription: e.target.value })}
                />
                {errors.newRiskDescription && (
                  <div className="error-message">{errors.newRiskDescription}</div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Автоматическое сохранение при достижении шага 3
  useEffect(() => {
    if (step === 3) {
      // Формируем результат оценки
      const result = {
        riskId: risk.id,
        rowIndex: risk.rowIndex,
        evaluationType,
        isAcceptable: evaluation.isAcceptable,
        comment: evaluation.comment,
        shouldCloseRisk: evaluation.shouldCloseRisk,
        shouldCreateNewRisk: evaluation.shouldCreateNewRisk,
        newRiskDescription: evaluation.newRiskDescription,
      };
      
      // Автоматически сохраняем оценку
      onComplete(result);
    }
  }, [step]); // Срабатывает при переходе на шаг 3

  // Шаг 3: Подтверждение (теперь только для отображения)
  const renderStep3 = () => (
    <div className="wizard-step">
      <h3>✓ Оценка подготовлена</h3>
      <p className="step-description" style={{ color: '#4CAF50', fontWeight: 600 }}>
        Оценка автоматически добавлена в очередь на сохранение.
      </p>
      
      <div className="confirmation-card">
        <div className="confirmation-row">
          <span className="label">Риск:</span>
          <span className="value">{risk.hazard_name || 'Без названия'}</span>
        </div>
        
        <div className="confirmation-row">
          <span className="label">Тип оценки:</span>
          <span className="value">
            {isFirstEvaluation ? 'Первичная оценка' : 'Оценка остаточного риска'}
          </span>
        </div>
        
        <div className="confirmation-row">
          <span className="label">Итоговый балл:</span>
          <span className={`value score-result ${getRiskLevelClass(riskScore)}`}>
            {riskScore}
          </span>
        </div>
        
        <div className="confirmation-row">
          <span className="label">Результат:</span>
          <span className={`value ${evaluation.isAcceptable ? 'acceptable-text' : 'not-acceptable-text'}`}>
            {evaluation.isAcceptable ? '✓ Допустимый' : '✗ Не допустимый'}
          </span>
        </div>
        
        {isFirstEvaluation && evaluation.isAcceptable && evaluation.shouldCloseRisk && (
          <div className="confirmation-row highlight">
            <span className="label">Действие:</span>
            <span className="value">🔒 Риск будет закрыт</span>
          </div>
        )}
        
        {evaluation.comment && (
          <div className="confirmation-row">
            <span className="label">Комментарий:</span>
            <span className="value comment-text">{evaluation.comment}</span>
          </div>
        )}
        
        {evaluation.shouldCreateNewRisk && evaluation.newRiskDescription && (
          <div className="confirmation-row highlight">
            <span className="label">Новый риск:</span>
            <span className="value comment-text">{evaluation.newRiskDescription}</span>
          </div>
        )}
      </div>
      
      <div className="info-box">
        <strong>ℹ️ Готово:</strong> Вы можете вернуться назад чтобы изменить оценку, или перейти к другому риску. 
        Все изменения будут сохранены после нажатия кнопки "Сохранить все риски".
      </div>
    </div>
  );

  // Валидация перед переходом к следующему шагу
  const validateStep = () => {
    const newErrors = {};
    
    if (step === 1) {
      if (evaluation.isAcceptable === null) {
        newErrors.isAcceptable = 'Необходимо выбрать допустимость риска';
      }
    }
    
    if (step === 2) {
      // Для не допустимых рисков комментарий обязателен
      if (evaluation.isAcceptable === false && !evaluation.comment.trim()) {
        newErrors.comment = 'Комментарий обязателен для не допустимых рисков';
      }
      
      // Если выбрано создание нового риска, описание обязательно
      if (evaluation.shouldCreateNewRisk && !evaluation.newRiskDescription.trim()) {
        newErrors.newRiskDescription = 'Необходимо описать новый риск';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обработчики навигации
  const handleNext = () => {
    if (!validateStep()) return;
    
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    }
  };

  // Больше не используется - автосохранение на шаге 3
  const handleComplete = () => {
    // Функция оставлена для совместимости, но не используется
  };

  // Определение класса для уровня риска
  const getRiskLevelClass = (score) => {
    if (!score) return '';
    if (score >= 16) return 'risk-high';
    if (score >= 8) return 'risk-medium';
    if (score >= 4) return 'risk-low';
    return 'risk-minimal';
  };

  return (
    <div className="risk-evaluation-wizard-overlay">
      <div className="risk-evaluation-wizard">
        {/* Заголовок */}
        <div className="wizard-header">
          <h2>
            {isFirstEvaluation ? 'Первичная оценка риска' : 'Оценка остаточного риска'}
          </h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        
        {/* Прогресс */}
        <div className="wizard-progress">
          <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Оценка</div>
          </div>
          <div className={`progress-line ${step > 1 ? 'active' : ''}`}></div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Действия</div>
          </div>
          <div className={`progress-line ${step > 2 ? 'active' : ''}`}></div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Подтверждение</div>
          </div>
        </div>
        
        {/* Контент шага */}
        <div className="wizard-content">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
        
        {/* Кнопки навигации */}
        <div className="wizard-footer">
          <div className="footer-left">
            {showCancelButton && (
              <button 
                className="btn btn-secondary" 
                onClick={onCancel}
              >
                Отменить
              </button>
            )}
            
            {/* Кнопка отмены оценки ЭТОГО риска */}
            {onCancelRisk && (
              <button 
                className="btn btn-danger-outline" 
                onClick={onCancelRisk}
                title="Отменить оценку этого риска (риск будет пропущен при сохранении)"
              >
                ✗ Отменить оценку риска
              </button>
            )}
          </div>
          
          <div className="footer-right">
            {step > 1 && (
              <button 
                className="btn btn-secondary" 
                onClick={handleBack}
              >
                ← Назад
              </button>
            )}
            
            {step < 3 && (
              <button 
                className="btn btn-primary" 
                onClick={handleNext}
              >
                Далее →
              </button>
            )}
            
            {/* Шаг 3 - автоматическое сохранение, кнопки не нужны */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskEvaluationWizard;

