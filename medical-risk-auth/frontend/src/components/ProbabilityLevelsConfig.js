import React, { useState, useEffect } from 'react';
import './SeverityLevelsConfig.css'; // Reuse the same CSS

/**
 * ProbabilityLevelsConfig - Компонент для настройки уровней вероятностей последствий
 *
 * Позволяет добавлять/удалять уровни вероятности
 * Минимум 2 уровня
 */
const ProbabilityLevelsConfig = ({
  probabilityLevels = [],
  onChange
}) => {
  const [levels, setLevels] = useState([]);
  const [errors, setErrors] = useState({});

  // Инициализация с дефолтными значениями или переданными (только при первом рендере)
  useEffect(() => {
    if (probabilityLevels && probabilityLevels.length > 0) {
      setLevels(probabilityLevels);
    } else {
      // Дефолтные уровни вероятности
      setLevels([
        { level: 1, name: "Маловероятный", description: "Маловероятно произойти (только в исключительном случае стечения нескольких редких ошибок и/или обстоятельств)" },
        { level: 2, name: "Отдаленный", description: "Может произойти, но не часто (возможно для немногих устройств, один или два раза за время эксплуатации)" },
        { level: 3, name: "Эпизодический", description: "Вероятно произойти (возможно для многих устройств один или два раза за время эксплуатации, или для отдельных устройств несколько раз за время эксплуатации)" },
        { level: 4, name: "Частый", description: "Происходит часто (происходит для многих или всех устройств несколько раз за время эксплуатации)" }
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Запускается только при первом рендере

  // Добавление нового уровня
  const addLevel = () => {
    const newLevel = levels.length > 0
      ? Math.max(...levels.map(l => l.level)) + 1
      : 1;

    const newLevels = [
      ...levels,
      {
        level: newLevel,
        name: "",
        description: ""
      }
    ];
    setLevels(newLevels);

    // Уведомляем родителя об изменении
    if (onChange) {
      onChange({
        probability_levels: newLevels
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

    // Уведомляем родителя об изменении
    if (onChange) {
      onChange({
        probability_levels: reindexedLevels
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
        probability_levels: newLevels
      });
    }
  };

  return (
    <div className="severity-levels-config">
      <div className="config-section">
        <h3>Уровни вероятностей последствий</h3>
        <p className="config-description">
          Настройте уровни вероятностей последствий. Уровень автоматически определяется порядковым номером.
        </p>

        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}

        <div className="levels-table probability-levels-table">
          <div className="levels-header">
            <div className="col-level">Уровень</div>
            <div className="col-name">Название</div>
            <div className="col-description">Описание</div>
            <div className="col-actions">Действия</div>
          </div>

          {levels.map((level, index) => (
            <div key={index} className="level-row">
              <div className="col-level">
                <span className="level-badge">{level.level}</span>
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
                  placeholder="Описание вероятности"
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
    </div>
  );
};

export default ProbabilityLevelsConfig;
