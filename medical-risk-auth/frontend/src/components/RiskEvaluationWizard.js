import React, { useState, useEffect } from 'react';
import './RiskEvaluationWizard.css';

/**
 * Упрощенный модуль оценки риска (один экран)
 * - Краткая информация о риске
 * - Автодопустимость по порогу (без ручной галочки)
 * - Комментарий обязателен только для недопустимого риска
 * - Кнопки: Сохранить риск / Отменить изменения
 */
const RiskEvaluationWizard = ({
  risk,
  evaluationType, // 'first' | 'second'
  acceptableRiskLevel = 10,
  onSaveRisk,
  onCancelRisk,
  showCancel = false,
  extraActionsLeft = null,
  extraActionsRight = null,
  currentEvaluation = null, // {isAcceptable, comment}
  centerButtons = false,
}) => {
  const isFirstEvaluation = evaluationType === 'first';
  const riskScore = isFirstEvaluation ? risk.risk_score : risk.residual_risk_score;
  const severityScore = isFirstEvaluation ? risk.severity_score : risk.residual_risk_level;
  const probabilityScore = isFirstEvaluation ? risk.probability_score : risk.residual_probability;

  const [isAcceptable, setIsAcceptable] = useState(true);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const autoAcceptable = (riskScore || 0) < acceptableRiskLevel;
    setIsAcceptable(currentEvaluation?.isAcceptable ?? autoAcceptable);
    setComment(currentEvaluation?.comment ?? '');
    setErrors({});
  }, [risk.id, risk.rowIndex, riskScore, acceptableRiskLevel, currentEvaluation]);

  const getRiskLevelClass = (score) => {
    if (score === null || score === undefined) return '';
    if (score >= acceptableRiskLevel) return 'not-acceptable';
    return 'acceptable';
  };

  const validate = () => {
    const newErrors = {};
    if (!isAcceptable && !comment.trim()) {
      newErrors.comment = '';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSaveRisk &&
      onSaveRisk({
        rowIndex: risk.rowIndex,
        evaluationType,
        isAcceptable,
        comment: comment.trim(),
      });
  };

  const handleCancel = () => {
    onCancelRisk && onCancelRisk(risk);
    const autoAcceptable = (riskScore || 0) < acceptableRiskLevel;
    setIsAcceptable(autoAcceptable);
    setComment('');
    setErrors({});
  };

  return (
    <div className="risk-evaluation-wizard simple">
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
          <span className="value score">{severityScore || '—'}</span>
        </div>
        <div className="risk-info-row">
          <span className="label">Вероятность:</span>
          <span className="value score">{probabilityScore || '—'}</span>
        </div>
        <div className="risk-info-row">
          <span className="label">Итоговый балл:</span>
          <span className={`value score-result ${getRiskLevelClass(riskScore)}`}>
            {riskScore || '—'}
          </span>
        </div>
        <div className="risk-info-row">
          <span className="label">Порог:</span>
          <span className="value">{acceptableRiskLevel}</span>
        </div>
      </div>

      <div className="evaluation-result">
        <p className="result-statement">Автооценка риска:</p>
        <div className={`result-indicator ${isAcceptable ? 'acceptable' : 'not-acceptable'}`}>
          <span className="result-icon">
            {isAcceptable ? '✓' : '✗'}
          </span>
          <span className="result-text">
            {isAcceptable ? 'Допустимый' : 'Не допустимый'}
          </span>
        </div>
        {!isAcceptable && !comment.trim() && (
          <div className="comment-required-alert">
            ⚠️ Для недопустимого риска обязательно требуется комментарий!
          </div>
        )}
      </div>

      <div className="comment-section">
        <label className="form-label">
          Комментарий {isAcceptable ? '(опционально)' : '(обязательно)'}
        </label>
        <textarea
          className="form-textarea"
          rows="3"
          placeholder={isAcceptable ? 'Добавьте при необходимости' : 'Опишите причины и меры управления'}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        {errors.comment && <div className="error-message">{errors.comment}</div>}
      </div>

      <div className={`wizard-actions simple-actions ${centerButtons ? 'centered' : ''}`}>
        {centerButtons ? (
          <div className="wizard-actions-center">
            <button type="button" className="bre-btn bre-btn-success" onClick={handleSave}>
              Сохранить риск
            </button>
            <button type="button" className="bre-btn bre-btn-secondary" onClick={handleCancel}>
              ↺ Сбросить изменения риска
            </button>
          </div>
        ) : (
          <>
            <div className="wizard-actions-left">
              <button type="button" className="bre-btn bre-btn-success" onClick={handleSave}>
                Сохранить риск
              </button>
              {showCancel && (
                <button type="button" className="bre-btn bre-btn-secondary" onClick={handleCancel}>
                  Отменить изменения
                </button>
              )}
              {extraActionsLeft}
            </div>
            <div className="wizard-actions-right">
              {extraActionsRight}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RiskEvaluationWizard;
