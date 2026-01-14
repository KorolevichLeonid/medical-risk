import React, { useState, useEffect } from 'react';
import './SeverityLevelsConfig.css';

/**
 * SeverityLevelsConfig - Компонент для настройки уровней тяжести последствий
 * 
 * Позволяет добавлять/удалять уровни тяжести
 * Автоматически вычисляет максимальное значение риска
 * Минимум 2 уровня
 */
const SeverityLevelsConfig = ({ 
  severityLevels = [], 
  riskThreshold = 10,
  onChange 
}) => {
  const [levels, setLevels] = useState([]);
  const [threshold, setThreshold] = useState(10);
  const [errors, setErrors] = useState({});

  // Инициализация с дефолтными значениями или переданными (только при первом рендере)
  useEffect(() => {
    if (severityLevels && severityLevels.length > 0) {
      setLevels(severityLevels);
    } else {
      // Дефолтные 5 уровней
      setLevels([
        { level: 1, score: 1, name: "Незначительный", description: "Приводит к неудобству или временному дискомфорту" },
        { level: 2, score: 2, name: "Незначительный/Легкий", description: "Приводит к временному повреждению или нарушению, не требующему медицинского вмешательства" },
        { level: 3, score: 3, name: "Серьезный/Значительный", description: "Приводит к повреждению или нарушению, требующему медицинского или хирургического вмешательства" },
        { level: 4, score: 4, name: "Критический", description: "Приводит к постоянному нарушению или необратимому повреждению" },
        { level: 5, score: 5, name: "Катастрофический/Фатальный", description: "Приводит к смерти" }
      ]);
    }

    if (riskThreshold) {
      setThreshold(riskThreshold);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Запускается только при первом рендере

  // Вычисление максимального значения риска (макс_уровень²)
  const getMaxRiskValue = () => {
    if (levels.length === 0) return 1;
    const maxLevel = Math.max(...levels.map(l => l.level));
    return maxLevel * maxLevel;
  };

  // Добавление нового уровня
  const addLevel = () => {
    const newLevel = levels.length > 0
      ? Math.max(...levels.map(l => l.level)) + 1
      : 1;

    // Ensure score is within 0-100 range
    const newScore = Math.min(100, Math.max(0, newLevel));

    const newLevels = [
      ...levels,
      {
        level: newLevel,
        score: newScore,
        name: "",
        description: ""
      }
    ];
    setLevels(newLevels);

    // Уведомляем родителя об изменении
    if (onChange) {
      onChange({
        severity_levels: newLevels,
        risk_threshold: threshold
      });
    }
  };

  // Удаление уровня
  const removeLevel = (index) => {
    if (levels.length <= 2) {
      setErrors({ ...errors, general: "Минимум 2 уровня должны остаться" });
      setTimeout(() => setErrors({}), 3000);
      return;
    }

    const newLevels = levels.filter((_, i) => i !== index);
    // Пересчитываем уровни чтобы они шли по порядку
    const reindexedLevels = newLevels.map((level, idx) => ({
      ...level,
      level: idx + 1
    }));
    setLevels(reindexedLevels);

    // Проверяем и корректируем порог риска если нужно
    const newMaxRisk = Math.max(...reindexedLevels.map(l => l.level)) ** 2;
    let newThreshold = threshold;
    if (threshold > newMaxRisk) {
      newThreshold = newMaxRisk;
      setThreshold(newMaxRisk);
    }
    
    // Уведомляем родителя об изменении
    if (onChange) {
      onChange({
        severity_levels: reindexedLevels,
        risk_threshold: newThreshold
      });
    }
  };

  // Обновление данных уровня
  const updateLevel = (index, field, value) => {
    const newLevels = [...levels];
    newLevels[index] = {
      ...newLevels[index],
      [field]: value
    };
    setLevels(newLevels);
    
    // Уведомляем родителя об изменении
    if (onChange) {
      onChange({
        severity_levels: newLevels,
        risk_threshold: threshold
      });
    }
  };

  // Изменение порогового значения
  const handleThresholdChange = (value) => {
    const numValue = parseInt(value);
    const maxRisk = getMaxRiskValue();

    let newThreshold;
    if (isNaN(numValue)) {
      newThreshold = '';
      setThreshold('');
    } else if (numValue < 1) {
      newThreshold = 1;
      setThreshold(1);
    } else if (numValue > maxRisk) {
      newThreshold = maxRisk;
      setThreshold(maxRisk);
    } else {
      newThreshold = numValue;
      setThreshold(numValue);
    }
    
    // Уведомляем родителя об изменении
    if (onChange && newThreshold !== '') {
      onChange({
        severity_levels: levels,
        risk_threshold: newThreshold
      });
    }
  };

  const maxRiskValue = getMaxRiskValue();

  return (
    <div className="severity-levels-config">
      <div className="config-section">
        <h3>Уровни тяжести последствий</h3>
        <p className="config-description">
          Настройте уровни тяжести последствий. Уровень автоматически определяется порядковым номером.
        </p>

        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}

        <div className="levels-table">
          <div className="levels-header">
            <div className="col-level">Уровень</div>
            <div className="col-score">Баллы</div>
            <div className="col-name">Название</div>
            <div className="col-description">Описание</div>
            <div className="col-actions">Действия</div>
          </div>

          {levels.map((level, index) => (
            <div key={index} className="level-row">
              <div className="col-level">
                <span className="level-badge">{level.level}</span>
              </div>
              <div className="col-score">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={level.score !== undefined ? level.score : level.level}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0 && parseInt(value) <= 100)) {
                      updateLevel(index, 'score', value === '' ? '' : parseInt(value));
                    }
                  }}
                  onKeyPress={(e) => {
                    // Allow only digits and control keys
                    if (!/[0-9]/.test(e.key) &&
                        e.key !== 'Tab' &&
                        e.key !== 'Escape' &&
                        e.key !== 'Enter' &&
                        !e.key.includes('Arrow')) {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    // Prevent pasting non-numeric content
                    const paste = e.clipboardData.getData('text');
                    if (!/^\d*$/.test(paste)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Баллы"
                  className="level-input"
                />
              </div>
              <div className="col-name">
                <input
                  type="text"
                  value={level.name}
                  onChange={(e) => updateLevel(index, 'name', e.target.value)}
                  placeholder="Название уровня"
                  className="level-input"
                />
              </div>
              <div className="col-description">
                <input
                  type="text"
                  value={level.description}
                  onChange={(e) => updateLevel(index, 'description', e.target.value)}
                  placeholder="Описание последствий"
                  className="level-input"
                />
              </div>
              <div className="col-actions">
                <button
                  type="button"
                  onClick={() => removeLevel(index)}
                  className="btn-remove"
                  disabled={levels.length <= 2}
                  title={levels.length <= 2 ? "Минимум 2 уровня" : "Удалить уровень"}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={addLevel} className="btn-add-level">
          + Добавить уровень
        </button>
      </div>

      <div className="config-section threshold-section">
        <h3>Уровень риска (доп./не доп.)</h3>
        <p className="config-description">
          Укажите пороговое значение уровня риска. Если произведение "Тяжесть вреда" × "Вероятность" 
          будет больше или равно этому значению, риск будет считаться <strong className="unacceptable">недопустимым</strong>.
          Если меньше - <strong className="acceptable">допустимым</strong>.
        </p>

        <div className="threshold-input-group">
          <label htmlFor="risk-threshold">Пороговое значение уровня риска:</label>
          <div className="threshold-controls">
            <input
              id="risk-threshold"
              type="number"
              min="1"
              max={maxRiskValue}
              value={threshold}
              onChange={(e) => handleThresholdChange(e.target.value)}
              className="threshold-input"
            />
            <span className="threshold-range">
              (от 1 до {maxRiskValue})
            </span>
          </div>
        </div>

        <div className="threshold-info">
          <div className="info-box">
            <strong>ℹ️ Пояснение:</strong> Максимальное значение риска рассчитывается как квадрат максимального уровня тяжести.
            <br />
            При текущих настройках: максимальный уровень = <strong>{levels.length > 0 ? Math.max(...levels.map(l => l.level)) : 0}</strong>, 
            максимальный риск = <strong>{maxRiskValue}</strong>
          </div>

          <div className="risk-examples">
            <div className="example">
              <span className="example-label">Пример допустимого риска:</span>
              <span className="example-value acceptable">
                Тяжесть: 2 × Вероятность: 2 = Риск: 4 {4 < threshold && '✓ допустимый'}
              </span>
            </div>
            <div className="example">
              <span className="example-label">Пример недопустимого риска:</span>
              <span className="example-value unacceptable">
                Тяжесть: 5 × Вероятность: 5 = Риск: 25 {25 >= threshold && '✗ недопустимый'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeverityLevelsConfig;
