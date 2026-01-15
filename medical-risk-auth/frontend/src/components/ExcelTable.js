import React, { useState, useEffect, useMemo } from 'react';
import './ExcelTable.css';
import RiskEvaluationWizard from './RiskEvaluationWizard';
import BatchRiskEvaluation from './BatchRiskEvaluation';
import API_BASE_URL from '../config';

const ExcelTable = ({ projectId, onClose, initialSheet = 'sheet1' }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSheet, setActiveSheet] = useState(initialSheet);
  const [cellColors, setCellColors] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [modifiedCells, setModifiedCells] = useState(new Set());
  const [columnWidths, setColumnWidths] = useState({});
  const [rowHeights, setRowHeights] = useState({});
  const [resizing, setResizing] = useState(null);
  const [showDeleteColumn, setShowDeleteColumn] = useState(null);
  const [showDeleteRow, setShowDeleteRow] = useState(null);

  // Состояние для роли пользователя в проекте
  const [userRole, setUserRole] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [loadingRole, setLoadingRole] = useState(true);
  
  // Состояние для оценки рисков
  const [showBatchEvaluation, setShowBatchEvaluation] = useState(false);
  const [risksToEvaluate, setRisksToEvaluate] = useState([]);
  const [dataBeforeChanges, setDataBeforeChanges] = useState(null); // Snapshot данных при последнем сохранении

  // Глобальное отслеживание изменений по всем листам
  const [allSheetsChanges, setAllSheetsChanges] = useState(() => {
    const saved = localStorage.getItem(`project_${projectId}_all_sheet_changes`);
    return saved ? JSON.parse(saved) : {};
  });
  const [currentSheetData, setCurrentSheetData] = useState(() => {
    const saved = localStorage.getItem(`project_${projectId}_current_sheet_data`);
    return saved ? JSON.parse(saved) : {};
  });
  
  // Для редактирования названий листов и столбцов
  const [editingSheetId, setEditingSheetId] = useState(null);
  const [editingSheetName, setEditingSheetName] = useState('');
  const [editingColumnKey, setEditingColumnKey] = useState(null);
  const [editingColumnLabel, setEditingColumnLabel] = useState('');
  const [customSheetNames, setCustomSheetNames] = useState(() => {
    const saved = localStorage.getItem(`project_${projectId}_sheet_names`);
    return saved ? JSON.parse(saved) : {};
  });
  const [customColumnLabels, setCustomColumnLabels] = useState(() => {
    const saved = localStorage.getItem(`project_${projectId}_column_labels`);
    return saved ? JSON.parse(saved) : {};
  });
  
  // Динамические листы (созданные пользователем)
  const [customSheets, setCustomSheets] = useState(() => {
    const saved = localStorage.getItem(`project_${projectId}_custom_sheets`);
    return saved ? JSON.parse(saved) : [];
  });

  // Состояние для этапов жизненного цикла проекта
  const [lifecycleStages, setLifecycleStages] = useState([]);
  const [customLifecycleStages, setCustomLifecycleStages] = useState([]);

  // Состояние для порогового значения уровня риска и уровней тяжести
  const [acceptableRiskLevel, setAcceptableRiskLevel] = useState(10);
  const [severityLevels, setSeverityLevels] = useState([
    { level: 1 }, { level: 2 }, { level: 3 }, { level: 4 }, { level: 5 }
  ]);

  // Флаг для отслеживания первоначальной загрузки
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Определение всех листов из Excel файла + пользовательские
  const baseSheets = useMemo(() => {
    // Если есть настроенные этапы жизненного цикла, использовать их
    if (lifecycleStages.length > 0 || customLifecycleStages.length > 0) {
      const dynamicSheets = [];

      // Основные этапы жизненного цикла
      lifecycleStages.forEach(stage => {
        dynamicSheets.push({
          id: stage, // Используем название этапа как id
          name: stage,
          icon: ''
        });
      });

      // Дополнительные этапы жизненного цикла
      customLifecycleStages.forEach(stage => {
        dynamicSheets.push({
          id: stage,
          name: stage,
          icon: ''
        });
      });

      // Добавляем статические листы
      const staticSheets = [
        { id: 'sheet7', name: 'Заключения-Выводы', icon: '' }
      ];

      return [...dynamicSheets, ...staticSheets];
    } else {
      // Fallback на старые листы, если этапы не настроены
      return [
        { id: 'operation', name: 'Эксплуатация', icon: '' },
        { id: 'maintenance', name: 'Техническое обслуживание', icon: '' },
        { id: 'storage', name: 'Хранение', icon: '' },
        { id: 'transport', name: 'Транспортировка', icon: '' },
        { id: 'disposal', name: 'Утилизация', icon: '' },
        { id: 'sheet7', name: 'Заключения-Выводы', icon: '' }
      ];
    }
  }, [lifecycleStages, customLifecycleStages]);
  
  const sheets = [...baseSheets, ...customSheets];

  // Проверка, является ли лист автоматически управляемым из Risk Analysis
  const isAutoManagedSheet = () => {
    // Для стандартных этапов жизненного цикла листы управляются из Risk Analysis
    return ['operation', 'maintenance', 'storage', 'transport', 'disposal'].includes(activeSheet) ||
           lifecycleStages.includes(activeSheet) ||
           customLifecycleStages.includes(activeSheet);
  };

  // Проверка, заблокирована ли ячейка для редактирования
  const isCellLocked = (rowIndex, columnKey) => {
    // Получаем данные строки
    const row = data[rowIndex];
    if (!row) return false;

    // Эти поля всегда только для автоматического расчета
    if (['risk_level_1', 'risk_level_2', 'residual_risk_score'].includes(columnKey)) {
      return true;
    }

    // Если риск полностью закрыт (fully_closed) - ВСЕ ячейки заблокированы
    if (row.risk_status === 'fully_closed') {
      return true;
    }


    // Если выполнена вторичная оценка и она не допустима - блокируем столбцы 1-20
    if (row.locked_after_second === true) {
      const lockedUntilColumn20 = [
        'hazard_category', 'hazard_name', 'event_sequence', 'hazardous_situation', 'harm',
        'severity_score', 'probability_score', 'risk_score', 'risk_level_1',
        'control_measure_1', 'control_measure_2', 'control_measure_3',
        'verification_1', 'verification_2', 'verification_3',
        'residual_risk_level', 'residual_probability', 'residual_risk_score', 'risk_level_2'
      ];
      if (lockedUntilColumn20.includes(columnKey)) {
        return true;
      }
    }

    // Если выполнена первичная оценка - блокируем столбцы 6-9 (НО НЕ comment_1)
    if (row.first_evaluation_done === true) {
      const lockedAfterFirstEval = ['severity_score', 'probability_score', 'risk_score', 'risk_level_1'];
      if (lockedAfterFirstEval.includes(columnKey)) {
        return true;
      }
    }

    // Анализ остаточный риск/польза доступен только после завершения оценок
    if (columnKey === 'risk_benefit_analysis') {
      if (!row.first_evaluation_done) return true;
      if (row.risk_status === 'pending_second') return true;
    }

    // Новые риски доступны только после закрытия риска
    if (columnKey === 'new_risks') {
      return row.risk_status !== 'closed' && row.risk_status !== 'fully_closed';
    }

    // Если в столбце "Новые риски" выбрано "нет" - блокируем редактирование
    if (columnKey === 'new_risks' && row.new_risks && row.new_risks.startsWith('нет')) {
      return true;
    }

    if (columnKey === 'comment_1') {
      return !row.first_evaluation_done;
    }

    if (columnKey === 'comment_2') {
      return !row.second_evaluation_done;
    }

    // ДО ПЕРВИЧНОЙ ОЦЕНКИ - блокируем ВСЁ что после первичной оценки + допуск и комментарий (9, 10)
    // risk_level_1 оставляем доступным для автоматического окрашивания
    if (!row.first_evaluation_done) {
      const lockedUntilFirstEval = [
        'comment_1', // ← Добавили допуск и комментарий первичной оценки
        'control_measure_1', 'control_measure_2', 'control_measure_3',
        'verification_1', 'verification_2', 'verification_3',
        'residual_risk_level', 'residual_probability', 'residual_risk_score',
        'risk_level_2', 'comment_2',
        'risk_benefit_analysis', 'new_risks'
      ];
      if (lockedUntilFirstEval.includes(columnKey)) {
        return true;
      }
    }

    // Блокируем первые 5 столбцов в листах этапов жизненного цикла (они управляются из Risk Analysis)
    const alwaysLockedColumns = ['hazard_category', 'hazard_name', 'event_sequence', 'hazardous_situation', 'harm'];

    return isAutoManagedSheet() && alwaysLockedColumns.includes(columnKey);
  };

  // Иерархическая структура столбцов с поддержкой многоуровневых заголовков
  const getColumnStructure = (sheetId) => {
    // Если лист является этапом жизненного цикла, возвращаем иерархическую структуру таблицы рисков
    if (isAutoManagedSheet()) {
      return [
        { key: 'hazard_category', label: 'Категория опасности', width: '220px', rowspan: 3 },
        { key: 'hazard_name', label: 'Наименование опасности', width: '200px', rowspan: 3 },
        { key: 'event_sequence', label: 'Последовательность событий', width: '200px', rowspan: 3 },
        { key: 'hazardous_situation', label: 'Опасная ситуация', width: '200px', rowspan: 3 },
        { key: 'harm', label: 'Вред', width: '150px', rowspan: 3 },
        { key: 'severity_score', label: 'Тяжесть вреда, балл', width: '120px', rowspan: 3 },
        { key: 'probability_score', label: 'Вероятность причинения вреда, балл', width: '150px', rowspan: 3 },
        { key: 'risk_score', label: 'Риск, балл', width: '100px', rowspan: 3 },
        { key: 'risk_level_1', label: 'Уровень риска (доп./не доп.)', width: '150px', rowspan: 3 },
        { key: 'comment_1', label: 'Комментарий', width: '200px', rowspan: 3 },
        // Группа "Контроль риска"
        { 
          label: 'Контроль риска', 
          colspan: 11, 
          isGroup: true,
          children: [
            // Подгруппа "Меры по управлению риском"
            {
              label: 'Меры по управлению риском',
              colspan: 3,
              isGroup: true,
              children: [
                { key: 'control_measure_1', label: 'Безопасность, заложенная в конструкции', width: '200px' },
                { key: 'control_measure_2', label: 'Защитная мера/средство', width: '180px' },
                { key: 'control_measure_3', label: 'Информация по безопасности/обучению', width: '200px' }
              ]
            },
            // Подгруппа "Верификация мер по управлению риском"
            {
              label: 'Верификация мер по управлению риском',
              colspan: 3,
              isGroup: true,
              children: [
                { key: 'verification_1', label: 'Безопасность, заложенная в конструкции', width: '200px' },
                { key: 'verification_2', label: 'Защитная мера/средство', width: '180px' },
                { key: 'verification_3', label: 'Информация по безопасности', width: '180px' }
              ]
            },
            // Остальные столбцы группы "Контроль риска"
            { key: 'residual_risk_level', label: 'Тяжесть вреда, балл', width: '130px', rowspan: 2 },
            { key: 'residual_probability', label: 'Вероятность причинения вреда, балл', width: '150px', rowspan: 2 },
            { key: 'residual_risk_score', label: 'Достигнутый риск и его уровень', width: '180px', rowspan: 2 },
            { key: 'risk_level_2', label: 'Уровень риска (доп./не доп.)', width: '150px', rowspan: 2 },
            { key: 'comment_2', label: 'Комментарий', width: '200px', rowspan: 2 }
          ]
        },
        { key: 'risk_benefit_analysis', label: 'Анализ остаточный риск/польза', width: '200px', rowspan: 3 },
        { key: 'new_risks', label: 'Новые риски в результате принятия мер по управлению', width: '250px', rowspan: 3 }
      ];
    }

    // Для статических листов - простая структура без иерархии
    return [{ key: 'content', label: 'Содержание', width: '800px', rowspan: 1 }];
  };

  // Извлекаем плоский список столбцов из иерархической структуры (для обратной совместимости)
  const flattenColumns = (structure) => {
    const result = [];
    const traverse = (items) => {
      items.forEach(item => {
        if (item.isGroup && item.children) {
          traverse(item.children);
        } else if (item.key) {
          result.push(item);
        }
      });
    };
    traverse(structure);
    return result;
  };

  const columnStructure = getColumnStructure(activeSheet);
  const columns = flattenColumns(columnStructure);

  // Функция для рендеринга многоуровневых заголовков
  const renderHierarchicalHeaders = () => {
    if (!isAutoManagedSheet()) {
      // Для обычных листов - простая структура
      return (
        <tr>
          <th className="row-number-header">№</th>
          {columns.map(column => (
            <th 
              key={column.key} 
              className="column-header"
              style={{ width: getColumnWidth(column.key), minWidth: '60px', position: 'relative' }}
              onDoubleClick={() => handleColumnDoubleClick(column.key)}
            >
              {editingColumnKey === column.key ? (
                <input
                  type="text"
                  className="column-label-input"
                  value={editingColumnLabel}
                  onChange={(e) => setEditingColumnLabel(e.target.value)}
                  onBlur={handleColumnLabelSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleColumnLabelSave();
                    } else if (e.key === 'Escape') {
                      setEditingColumnKey(null);
                      setEditingColumnLabel('');
                    }
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="column-header-content">
                  {getColumnLabel(activeSheet, column.key)}
                </div>
              )}
            </th>
          ))}
          <th></th>
        </tr>
      );
    }

    // Для листов с рисками - иерархическая структура
    const rows = [[], [], []]; // 3 уровня заголовков

    // Первый ряд - верхний уровень
    rows[0].push(<th key="number-0" className="row-number-header" rowSpan={3}>№</th>);
    
    columnStructure.forEach((col, index) => {
      if (col.rowspan) {
        // Столбец занимает несколько рядов
        rows[0].push(
          <th 
            key={`col-0-${col.key || index}`}
            className="column-header"
            style={{ width: getColumnWidth(col.key), minWidth: '60px' }}
            rowSpan={col.rowspan}
          >
            <div className="column-header-content" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {isAutoManagedSheet() && ['hazard_category', 'hazard_name', 'event_sequence', 'hazardous_situation', 'harm'].includes(col.key) && <span title="Столбец управляется из Risk Analysis">🔒</span>}
              {col.label}
            </div>
          </th>
        );
      } else if (col.isGroup && col.children) {
        // Группа столбцов
        rows[0].push(
          <th 
            key={`group-0-${index}`}
            className="column-header column-group-header"
            style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}
            colSpan={col.colspan}
          >
            {col.label}
          </th>
        );

        // Обрабатываем детей группы
        col.children.forEach((child, childIndex) => {
          if (child.rowspan) {
            // Столбец с rowspan в подгруппе
            rows[1].push(
              <th 
                key={`col-1-${child.key || `${index}-${childIndex}`}`}
                className="column-header"
                style={{ width: getColumnWidth(child.key), minWidth: '60px' }}
                rowSpan={child.rowspan}
              >
                {child.label}
              </th>
            );
          } else if (child.isGroup && child.children) {
            // Подгруппа второго уровня
            rows[1].push(
              <th 
                key={`subgroup-1-${index}-${childIndex}`}
                className="column-header column-subgroup-header"
                style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f5f5f5' }}
                colSpan={child.colspan}
              >
                {child.label}
              </th>
            );

            // Обрабатываем детей подгруппы (третий уровень)
            child.children.forEach((subChild) => {
              rows[2].push(
                <th 
                  key={`col-2-${subChild.key}`}
                  className="column-header"
                  style={{ width: getColumnWidth(subChild.key), minWidth: '60px' }}
                >
                  <div className="column-header-content">
                    {subChild.label}
                  </div>
                </th>
              );
            });
          }
        });
      }
    });

    // Добавляем пустую ячейку в конце каждого ряда
    rows[0].push(<th key="empty-0"></th>);
    rows[1].push(<th key="empty-1"></th>);
    rows[2].push(<th key="empty-2"></th>);

    return rows.map((rowCells, rowIndex) => (
      <tr key={`header-row-${rowIndex}`}>
        {rowCells}
      </tr>
    ));
  };

  // Функция для получения буквы столбца (A, B, C...)
  const getColumnLetter = (index) => {
    let letter = '';
    let num = index;
    while (num >= 0) {
      letter = String.fromCharCode(65 + (num % 26)) + letter;
      num = Math.floor(num / 26) - 1;
    }
    return letter;
  };

  // Получить название листа (пользовательское или оригинальное)
  const getSheetName = (sheetId) => {
    return customSheetNames[sheetId] || sheets.find(s => s.id === sheetId)?.name || sheetId;
  };

  // Получить название столбца (пользовательское или оригинальное)
  const getColumnLabel = (sheetId, columnKey) => {
    const customKey = `${sheetId}_${columnKey}`;
    return customColumnLabels[customKey] || columns.find(c => c.key === columnKey)?.label || columnKey;
  };

  // Начать редактирование названия листа
  const handleSheetDoubleClick = (sheetId) => {
    setEditingSheetId(sheetId);
    setEditingSheetName(getSheetName(sheetId));
  };

  // Сохранить новое название листа
  const handleSheetNameSave = () => {
    if (editingSheetId && editingSheetName.trim()) {
      const newCustomNames = {
        ...customSheetNames,
        [editingSheetId]: editingSheetName.trim()
      };
      setCustomSheetNames(newCustomNames);
      localStorage.setItem(`project_${projectId}_sheet_names`, JSON.stringify(newCustomNames));
    }
    setEditingSheetId(null);
    setEditingSheetName('');
  };

  // Начать редактирование названия столбца
  const handleColumnDoubleClick = (columnKey) => {
    setEditingColumnKey(columnKey);
    setEditingColumnLabel(getColumnLabel(activeSheet, columnKey));
  };

  // Сохранить новое название столбца
  const handleColumnLabelSave = () => {
    if (editingColumnKey && editingColumnLabel.trim()) {
      const customKey = `${activeSheet}_${editingColumnKey}`;
      const newCustomLabels = {
        ...customColumnLabels,
        [customKey]: editingColumnLabel.trim()
      };
      setCustomColumnLabels(newCustomLabels);
      localStorage.setItem(`project_${projectId}_column_labels`, JSON.stringify(newCustomLabels));
    }
    setEditingColumnKey(null);
    setEditingColumnLabel('');
  };

  // Добавить новый лист
  const handleAddNewSheet = () => {
    const sheetName = prompt('Введите название нового листа:', 'Новый лист');
    if (!sheetName || !sheetName.trim()) return;
    
    const newSheetId = `custom_sheet_${Date.now()}`;
    const newSheet = {
      id: newSheetId,
      name: sheetName.trim(),
      icon: ''
    };
    
    const updatedCustomSheets = [...customSheets, newSheet];
    setCustomSheets(updatedCustomSheets);
    localStorage.setItem(`project_${projectId}_custom_sheets`, JSON.stringify(updatedCustomSheets));
    
    // Создаем пустые данные для нового листа
    const emptyData = [];
    for (let i = 0; i < 20; i++) {
      emptyData.push({
        number: i + 1,
        id: null,
        isNew: true,
        content: ''
      });
    }
    
    // Сохраняем пустые данные для нового листа
    localStorage.setItem(`project_${projectId}_${newSheetId}`, JSON.stringify(emptyData));
    
    // Переключаемся на новый лист
    setActiveSheet(newSheetId);
    setHasChanges(true);
  };

  // Удалить лист (только пользовательские листы)
  const handleDeleteSheet = (sheetId, e) => {
    e.stopPropagation();
    
    // Проверяем, что это пользовательский лист
    if (!sheetId.startsWith('custom_sheet_')) {
      alert('Нельзя удалить базовый лист!');
      return;
    }
    
    const sheetToDelete = customSheets.find(s => s.id === sheetId);
    if (!sheetToDelete) return;
    
    if (!window.confirm(`Удалить лист "${sheetToDelete.name}"?`)) return;
    
    // Удаляем лист из массива
    const updatedCustomSheets = customSheets.filter(s => s.id !== sheetId);
    setCustomSheets(updatedCustomSheets);
    localStorage.setItem(`project_${projectId}_custom_sheets`, JSON.stringify(updatedCustomSheets));
    
    // Удаляем данные листа
    localStorage.removeItem(`project_${projectId}_${sheetId}`);
    
    // Переключаемся на первый лист, если удаляем активный
    if (activeSheet === sheetId) {
      setActiveSheet('operation');
    }
    
    setHasChanges(true);
  };

  // Основные цвета для заливки
  const colors = [
    { name: 'Белый', value: '#FFFFFF' },
    { name: 'Желтый', value: '#FFEB3B' },
    { name: 'Оранжевый', value: '#FF9800' },
    { name: 'Красный', value: '#F44336' },
    { name: 'Зеленый', value: '#4CAF50' },
    { name: 'Синий', value: '#2196F3' },
    { name: 'Серый', value: '#9E9E9E' }
  ];

  // Обработка цвета ячейки
  const handleCellColorChange = (rowIndex, columnKey, color) => {
    // Не позволяем менять цвет заблокированных ячеек
    if (isCellLocked(rowIndex, columnKey)) {
      return;
    }
    const cellKey = `${activeSheet}_${rowIndex}_${columnKey}`;
    setCellColors({
      ...cellColors,
      [cellKey]: color
    });
    setHasChanges(true);
  };

  const getCellColor = (rowIndex, columnKey) => {
    const cellKey = `${activeSheet}_${rowIndex}_${columnKey}`;
    return cellColors[cellKey] || '#FFFFFF';
  };

  // Функции для работы с размерами
  const getColumnWidth = (columnKey) => {
    const widthKey = `${activeSheet}_${columnKey}`;
    return columnWidths[widthKey] || '150px';
  };

  const getRowHeight = (rowIndex) => {
    const heightKey = `${activeSheet}_${rowIndex}`;
    return rowHeights[heightKey] || '40px';
  };

  const handleColumnResizeStart = (columnKey, e) => {
    e.preventDefault();
    const widthKey = `${activeSheet}_${columnKey}`;
    const widthValue = columnWidths[widthKey];
    const startWidth = widthValue ? parseInt(widthValue) : 150;
    setResizing({ type: 'column', key: columnKey, startX: e.clientX, startWidth });
  };

  const handleRowResizeStart = (rowIndex, e) => {
    e.preventDefault();
    const heightKey = `${activeSheet}_${rowIndex}`;
    const heightValue = rowHeights[heightKey];
    const startHeight = heightValue ? parseInt(heightValue) : 40;
    setResizing({ type: 'row', key: rowIndex, startY: e.clientY, startHeight });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e) => {
      if (resizing.type === 'column') {
        const diff = e.clientX - resizing.startX;
        const newWidth = Math.max(60, resizing.startWidth + diff);
        const widthKey = `${activeSheet}_${resizing.key}`;
        setColumnWidths(prev => ({ ...prev, [widthKey]: `${newWidth}px` }));
      } else if (resizing.type === 'row') {
        const diff = e.clientY - resizing.startY;
        const newHeight = Math.max(30, resizing.startHeight + diff);
        const heightKey = `${activeSheet}_${resizing.key}`;
        setRowHeights(prev => ({ ...prev, [heightKey]: `${newHeight}px` }));
      }
    };

    const handleMouseUp = () => {
      setResizing(null);
      setHasChanges(true);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, activeSheet]);

  // Загрузка данных при монтировании и смене листа
  useEffect(() => {
    loadData();
  }, [projectId, activeSheet]);

  // Загрузка роли пользователя при монтировании компонента
  useEffect(() => {
    loadUserRole();

    // Логирование данных пользователя в консоль
    const logUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/users/me/permissions?project_id=${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('Данные пользователя (ExcelTable):', userData);
          console.log('Разрешения пользователя (ExcelTable):', userData.permissions);
          // Сохраняем разрешения в состоянии
          setUserPermissions(userData.permissions || []);
        }
      } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
      }
    };

    logUserData();
  }, [projectId]);

  // Обновление активного листа при изменении initialSheet
  useEffect(() => {
    if (isInitialLoad) {
      if (initialSheet === 'first') {
        // Если указан 'first', установим его при следующей загрузке данных
        // Не устанавливаем сразу, чтобы дождаться загрузки sheets
      } else {
        // Для других значений initialSheet устанавливаем сразу
        setActiveSheet(initialSheet);
        setIsInitialLoad(false);
      }
    }
  }, [initialSheet, isInitialLoad]);

  // Отдельный useEffect для установки первого листа после загрузки данных (только один раз)
  useEffect(() => {
    if (initialSheet === 'first' && isInitialLoad && sheets.length > 0) {
      const firstSheetId = sheets[0]?.id || 'operation';
      setActiveSheet(firstSheetId);
      setIsInitialLoad(false);
    }
  }, [sheets]); // Убираем initialSheet и isInitialLoad из зависимостей, чтобы избежать повторных вызовов

  const loadUserRole = async () => {
    setLoadingRole(true);
    try {
      // Пробуем разные ключи для токена
      const possibleTokens = [
        localStorage.getItem('auth_token'),
        localStorage.getItem('token'),
        localStorage.getItem('access_token'),
        localStorage.getItem('jwt_token'),
        localStorage.getItem('accessToken'),
        localStorage.getItem('id_token')
      ];

      const token = possibleTokens.find(t => t !== null);

      if (!token) {
        console.warn('Токен авторизации не найден в localStorage');
        console.log('Доступные ключи в localStorage:', Object.keys(localStorage));
        // Пробуем получить токен из sessionStorage тоже
        const sessionTokens = [
          sessionStorage.getItem('auth_token'),
          sessionStorage.getItem('token'),
          sessionStorage.getItem('access_token'),
          sessionStorage.getItem('jwt_token')
        ];
        const sessionToken = sessionTokens.find(t => t !== null);
        if (sessionToken) {
          console.log('Найден токен в sessionStorage');
        } else {
          console.warn('Токен не найден ни в localStorage, ни в sessionStorage');
          setUserRole('guest');
          setLoadingRole(false);
          return;
        }
      }

      const finalToken = token || sessionToken;
      console.log('Найден токен, загружаем роль пользователя для проекта:', projectId);

      // Загружаем роль пользователя в проекте из API
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/my-role`, {
        headers: {
          'Authorization': `Bearer ${finalToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Ответ сервера роли:', response.status, response.statusText);

      if (response.ok) {
        const roleData = await response.json();
        console.log('Данные роли пользователя в проекте:', roleData);

        // Вывод информации о этапах жизненного цикла проекта
        const projectLifecycleStages = roleData.lifecycle_stages || roleData.custom_lifecycle_stages;
        if (projectLifecycleStages) {
          console.log('Этапы жизненного цикла проекта:', projectLifecycleStages);
        } else {
          // Если не настроены, выводим стандартные этапы (fallback)
          console.log('Этапы жизненного цикла проекта:', [
            'эксплуатация',
            'техническое обслуживание',
            'хранение',
            'транспортировка',
            'утилизация'
          ]);
        }

        setUserRole(roleData.user_role);
        setLifecycleStages(roleData.lifecycle_stages || []);
        setCustomLifecycleStages(roleData.custom_lifecycle_stages || []);

        // Получаем информацию о проекте для получения порога риска и уровней тяжести
        try {
          const projectResponse = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
            headers: {
              'Authorization': `Bearer ${finalToken}`,
            },
          });

          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            // Порог риска: сначала новое поле, потом старое, потом дефолт
            setAcceptableRiskLevel(projectData.risk_threshold || projectData.acceptable_risk_level || 10);
            // Уровни тяжести: если нет, дефолт 1..5
            if (projectData.severity_levels && projectData.severity_levels.length > 0) {
              setSeverityLevels(projectData.severity_levels);
            } else {
              setSeverityLevels([
                { level: 1 }, { level: 2 }, { level: 3 }, { level: 4 }, { level: 5 }
              ]);
            }
          }
        } catch (error) {
          console.error('Failed to load project acceptable risk level:', error);
          setAcceptableRiskLevel(10); // Default value
          setSeverityLevels([{ level: 1 }, { level: 2 }, { level: 3 }, { level: 4 }, { level: 5 }]);
        }
      } else if (response.status === 401) {
        console.warn('Ошибка авторизации - токен недействителен');
        setUserRole('guest');
      } else if (response.status === 403) {
        console.warn('Доступ запрещен - недостаточно прав');
        setUserRole('guest');
      } else if (response.status === 404) {
        console.warn('Проект не найден или пользователь не является участником проекта');
        setUserRole('guest');
      } else {
        console.warn('Не удалось загрузить роль пользователя:', response.statusText);
        setUserRole('guest');
      }
    } catch (error) {
      console.error('Failed to load user role:', error);
      setUserRole('guest');
    } finally {
      setLoadingRole(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Загружаем пользовательские имена и настройки из localStorage (временно)
      const savedSheetNames = localStorage.getItem(`project_${projectId}_sheet_names`);
      if (savedSheetNames) {
        setCustomSheetNames(JSON.parse(savedSheetNames));
      }

      const savedColumnLabels = localStorage.getItem(`project_${projectId}_column_labels`);
      if (savedColumnLabels) {
        setCustomColumnLabels(JSON.parse(savedColumnLabels));
      }

      const savedCustomSheets = localStorage.getItem(`project_${projectId}_custom_sheets`);
      if (savedCustomSheets) {
        setCustomSheets(JSON.parse(savedCustomSheets));
      }

      const savedColumnWidths = localStorage.getItem(`project_${projectId}_column_widths`);
      if (savedColumnWidths) {
        setColumnWidths(JSON.parse(savedColumnWidths));
      }

      const savedRowHeights = localStorage.getItem(`project_${projectId}_row_heights`);
      if (savedRowHeights) {
        setRowHeights(JSON.parse(savedRowHeights));
      }

      // Загружаем данные таблицы из API без авторизации (тест)
      const response = await fetch(`${API_BASE_URL}/api/risk-tables/project/${projectId}/sheets/${activeSheet}`); // Убираем Authorization header

      if (response.ok) {
        const tableData = await response.json();

        // Преобразуем данные из API в формат компонента
        const formattedData = tableData.rows.map((row, index) => ({
          ...row.data,
          number: row.row_number,
          id: row.id,
          // Сохраняем cell_colors отдельно для совместимости
          cell_colors: row.cell_colors,
        }));

        setData(formattedData);
        const initialCellColors = formattedData.reduce((acc, row, index) => {
          if (row.cell_colors) {
            Object.entries(row.cell_colors).forEach(([colKey, color]) => {
              acc[`${activeSheet}_${index}_${colKey}`] = color;
            });
          }
          return acc;
        }, {});
        setCellColors(initialCellColors);
        
        // Сохраняем snapshot загруженных данных для отката при отмене оценки
        setDataBeforeChanges({
          data: JSON.parse(JSON.stringify(formattedData)),
          cellColors: { ...initialCellColors }
        });
      } else if (response.status === 404) {
        // Таблица не существует, создаем пустые данные
        const emptyData = [];
        const cols = columns; // Используем уже вычисленный список столбцов

        for (let i = 0; i < 20; i++) {
          const row = { number: i + 1, id: null, isNew: true };
          cols.forEach(col => {
            if (col.key !== 'number') {
              row[col.key] = '';
            }
          });
          emptyData.push(row);
        }

        setData(emptyData);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Ошибка при загрузке данных. Проверьте подключение к серверу.');
    } finally {
      setLoading(false);
    }
  };

  // Максимальный балл из настроенных уровней тяжести
  const maxSeverityLevel = useMemo(() => {
    if (!severityLevels || severityLevels.length === 0) return 10;
    return Math.max(...severityLevels.map((lvl) => Number(lvl.level) || 0));
  }, [severityLevels]);

  const handleCellChange = (rowIndex, columnKey, value) => {
    // Валидация для столбцов - только цифры, без ограничения диапазона
    if (columnKey === 'severity_score' || columnKey === 'probability_score' ||
        columnKey === 'residual_risk_level' || columnKey === 'residual_probability') {
      // Разрешаем только цифры
      const numericValue = value.replace(/[^0-9]/g, '');

      // Если значение пустое, устанавливаем пустую строку
      if (numericValue === '') {
        value = '';
      } else {
        value = numericValue;
      }
    }

    const newData = [...data];
    newData[rowIndex] = {
      ...newData[rowIndex],
      [columnKey]: value,
      isNew: false
    };

    if (columnKey === 'risk_benefit_analysis') {
      if (value === 'да' || value === 'нет') {
        newData[rowIndex].risk_status = 'closed';
      } else {
        newData[rowIndex].risk_status = 'pending_benefit';
      }
    }

    // Автоматический расчет риска
    if (columnKey === 'severity_score' || columnKey === 'probability_score') {
      const severity = parseInt(newData[rowIndex].severity_score) || 0;
      const probability = parseInt(newData[rowIndex].probability_score) || 0;
      newData[rowIndex].risk_score = severity * probability;

      // Автоматически обновляем уровень риска при изменении risk_score
      const riskScore = newData[rowIndex].risk_score;
      if (riskScore >= acceptableRiskLevel) {
        newData[rowIndex].risk_level_1 = 'не допустимый';
        handleCellColorChange(rowIndex, 'risk_level_1', '#FF4444');
      } else if (riskScore > 0 && riskScore < acceptableRiskLevel) {
        newData[rowIndex].risk_level_1 = 'допустимый';
        handleCellColorChange(rowIndex, 'risk_level_1', '#4CAF50');
      } else {
        newData[rowIndex].risk_level_1 = '';
        handleCellColorChange(rowIndex, 'risk_level_1', '#FFFFFF');
      }
    }

    // Автоматический расчет остаточного риска
    if (columnKey === 'residual_risk_level' || columnKey === 'residual_probability') {
      const severity = parseInt(newData[rowIndex].residual_risk_level) || 0;
      const probability = parseInt(newData[rowIndex].residual_probability) || 0;
      const residualScore = severity * probability;
      newData[rowIndex].residual_risk_score = residualScore;

      // Автоматически обновляем уровень остаточного риска при изменении residual_risk_score
      if (residualScore >= acceptableRiskLevel) {
        newData[rowIndex].risk_level_2 = 'не допустимый';
        handleCellColorChange(rowIndex, 'risk_level_2', '#FF4444');
      } else if (residualScore > 0 && residualScore < acceptableRiskLevel) {
        newData[rowIndex].risk_level_2 = 'допустимый';
        handleCellColorChange(rowIndex, 'risk_level_2', '#4CAF50');
      } else {
        newData[rowIndex].risk_level_2 = '';
        handleCellColorChange(rowIndex, 'risk_level_2', '#FFFFFF');
      }
    }

    setData(newData);

    // Обновляем данные текущего листа
    setCurrentSheetData(prev => ({
      ...prev,
      [activeSheet]: newData
    }));

    // Отслеживаем измененные ячейки для текущего листа
    const cellKey = `${activeSheet}_${rowIndex}_${columnKey}`;
    setModifiedCells(prev => new Set([...prev, cellKey]));

    // Обновляем глобальное отслеживание изменений
    setAllSheetsChanges(prev => ({
      ...prev,
      [activeSheet]: new Set([...(prev[activeSheet] ? Array.from(prev[activeSheet]) : []), rowIndex])
    }));

    setHasChanges(true);

    // Сохраняем глобальное состояние в localStorage
    const currentSheetChanges = allSheetsChanges[activeSheet] ? Array.from(allSheetsChanges[activeSheet]) : [];
    const updatedAllSheetsChanges = {
      ...allSheetsChanges,
      [activeSheet]: new Set([...currentSheetChanges, rowIndex])
    };
    localStorage.setItem(`project_${projectId}_all_sheet_changes`, JSON.stringify(updatedAllSheetsChanges));

    const updatedCurrentSheetData = {
      ...currentSheetData,
      [activeSheet]: newData
    };
    localStorage.setItem(`project_${projectId}_current_sheet_data`, JSON.stringify(updatedCurrentSheetData));
  };

  const handleCellDoubleClick = (rowIndex, columnKey) => {
    // Проверяем, не заблокирована ли ячейка
    if (isCellLocked(rowIndex, columnKey)) {
      return; // Не позволяем редактировать заблокированные ячейки
    }
    setEditingCell({ rowIndex, columnKey });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  // Функция для поиска рисков требующих оценки
  const findRisksNeedingEvaluation = () => {
    if (!isAutoManagedSheet()) {
      return []; // Оценка требуется только для листов этапов жизненного цикла
    }
    
    // Проверяем, может ли текущий пользователь оценивать риски
    if (userRole !== 'doctor' && userRole !== 'admin') {
      return []; // Только doctor и admin могут оценивать
    }
    
    const risksNeedingEval = [];
    
    data.forEach((row, rowIndex) => {
      // Пропускаем полностью закрытые риски
      if (row.risk_status === 'fully_closed') {
        return;
      }
      
      // Проверяем первичную оценку (столбцы 6-8)
      const hasSeverity = row.severity_score && row.severity_score.toString().trim() !== '';
      const hasProbability = row.probability_score && row.probability_score.toString().trim() !== '';
      const hasRiskScore = row.risk_score && row.risk_score.toString().trim() !== '';
      
      // Если заполнены оценки но нет first_evaluation_done - нужна первичная оценка
      if (hasSeverity && hasProbability && hasRiskScore && !row.first_evaluation_done) {
        risksNeedingEval.push({
          rowIndex,
          id: row.risk_id || row.id,
          hazard_name: row.hazard_name || 'Без названия',
          hazard_category: row.hazard_category || '',
          severity_score: row.severity_score,
          probability_score: row.probability_score,
          risk_score: row.risk_score,
          evaluationType: 'first'
        });
      }
      
      // Проверяем вторичную оценку (столбцы 17-19)
      const hasResidualSeverity = row.residual_risk_level && row.residual_risk_level.toString().trim() !== '';
      const hasResidualProbability = row.residual_probability && row.residual_probability.toString().trim() !== '';
      const hasResidualScore = row.residual_risk_score && row.residual_risk_score.toString().trim() !== '';
      
      // Если заполнены остаточные оценки но нет second_evaluation_done - нужна вторичная оценка
      if (hasResidualSeverity && hasResidualProbability && hasResidualScore && !row.second_evaluation_done) {
        risksNeedingEval.push({
          rowIndex,
          id: row.risk_id || row.id,
          hazard_name: row.hazard_name || 'Без названия',
          hazard_category: row.hazard_category || '',
          residual_risk_level: row.residual_risk_level,
          residual_probability: row.residual_probability,
          residual_risk_score: row.residual_risk_score,
          evaluationType: 'second'
        });
      }
    });
    
    return risksNeedingEval;
  };

  // Восстанавливаем данные для отмененных рисков из snapshot (до изменений)
  const restoreDataForCancelledRisks = (cancelledIndices) => {
    if (!cancelledIndices || cancelledIndices.length === 0 || !dataBeforeChanges) return;
    
    const newData = [...data];
    const newCellColors = { ...cellColors };
    
    cancelledIndices.forEach(rowIndex => {
      const row = newData[rowIndex];
      if (!row) return;
      
      // Находим тип оценки для этого риска
      const risk = risksToEvaluate.find(r => r.rowIndex === rowIndex);
      if (!risk) return;
      
      const snapshotRow = dataBeforeChanges.data[rowIndex];
      if (!snapshotRow) return;
      
      // Определяем какие поля нужно восстановить в зависимости от типа оценки
      let fieldsToRestore = [];
      
      if (risk.evaluationType === 'first') {
        // Для первичной оценки восстанавливаем только поля оценки
        fieldsToRestore = ['severity_score', 'probability_score', 'risk_score'];
      } else if (risk.evaluationType === 'second') {
        // Для вторичной оценки
        fieldsToRestore = ['residual_risk_level', 'residual_probability', 'residual_risk_score'];
      }
      
      // Восстанавливаем значения из snapshot (состояние ДО начала редактирования)
      fieldsToRestore.forEach(field => {
        row[field] = snapshotRow[field] || '';
        
        // Восстанавливаем или удаляем цвета
        const colorKey = `${activeSheet}_${rowIndex}_${field}`;
        if (dataBeforeChanges.cellColors[colorKey]) {
          newCellColors[colorKey] = dataBeforeChanges.cellColors[colorKey];
        } else {
          delete newCellColors[colorKey];
        }
      });
    });
    
    setData(newData);
    setCellColors(newCellColors);
  };

  // Применяем результаты оценок к данным
  const applyEvaluations = (evaluations) => {
    const newData = [...data];
    const newCellColors = { ...cellColors };
    const now = new Date().toISOString();
    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
    
    evaluations.forEach(evaluation => {
      const rowIndex = evaluation.rowIndex;
      const row = newData[rowIndex];
      
      if (!row) return;
      
      if (evaluation.evaluationType === 'first') {
        row.first_evaluation_done = true;
        row.evaluation_timestamp = now;
        row.evaluated_by = currentUserId;

        if (evaluation.comment) {
          row.comment_1 = evaluation.comment;
        }

        // Если риск допустим — закрываем и блокируем
        if (evaluation.isAcceptable) {
          row.risk_status = 'pending_benefit';
          row.locked_after_second = true;
        } else {
          // Недопустим — нужен переход ко вторичной оценке
          row.risk_status = 'pending_second';
        }
      } else if (evaluation.evaluationType === 'second') {
        row.second_evaluation_done = true;
        row.evaluation_timestamp = now;
        row.evaluated_by = currentUserId;

        if (evaluation.comment && evaluation.comment.trim()) {
          row.comment_2 = evaluation.comment;
        }

        // Во вторичной оценке риск всегда закрывается
        row.locked_after_second = true;
        row.risk_status = 'pending_benefit';
      }
    });
    
    setData(newData);
    setCellColors(newCellColors);
  };

  const handleSave = async () => {
    // Проверяем, есть ли риски требующие оценки
    const risksNeedingEval = findRisksNeedingEvaluation();

    if (risksNeedingEval.length > 0) {
      // Показываем batch evaluation (snapshot уже создан при загрузке данных)
      setRisksToEvaluate(risksNeedingEval);
      setShowBatchEvaluation(true);
      return; // Не продолжаем сохранение, пока не будет оценка
    }

    // Продолжаем обычное сохранение
    await performSave();
  };

  // Функция сохранения всех листов
  const handleSaveAllSheets = async () => {
    setSaving(true);
    try {
      const sheetsToSave = Object.keys(allSheetsChanges).filter(sheetId =>
        allSheetsChanges[sheetId].size > 0
      );

      if (sheetsToSave.length === 0) {
        alert('Нет изменений для сохранения');
        return;
      }

      // Сохраняем каждый лист отдельно
      for (const sheetId of sheetsToSave) {
        await saveSheetData(sheetId, currentSheetData[sheetId]);
      }

      // Очищаем состояние изменений
      setAllSheetsChanges({});
      setCurrentSheetData({});
      localStorage.removeItem(`project_${projectId}_all_sheet_changes`);
      localStorage.removeItem(`project_${projectId}_current_sheet_data`);

      // Сбрасываем локальные изменения для текущего листа
      setHasChanges(false);
      setModifiedCells(new Set());

      alert(`Успешно сохранено ${sheetsToSave.length} листов!`);
    } catch (error) {
      console.error('Failed to save all sheets:', error);
      alert('Ошибка при сохранении. Проверьте подключение к серверу.');
    } finally {
      setSaving(false);
    }
  };

  // Вспомогательная функция для сохранения данных листа
  const saveSheetData = async (sheetId, sheetData) => {
    const columns = getColumnStructure(sheetId);
    const flatColumns = flattenColumns(columns);

    // Подготавливаем данные для отправки на API
    const columnDefinitions = flatColumns.map((col, index) => ({
      key: col.key,
      label: col.label,
      width: col.width,
      column_index: index
    }));

    const rowData = sheetData.map((row, index) => {
      // Извлекаем данные строки, исключая вспомогательные поля
      const rowDataOnly = { ...row };
      delete rowDataOnly.number;
      delete rowDataOnly.id;
      delete rowDataOnly.isNew;
      delete rowDataOnly.cell_colors;

      // Получаем цвета ячеек для конкретной строки
      const cellColorsForRow = {};
      Object.entries(cellColors)
        .filter(([key, color]) => key.startsWith(`${sheetId}_${index}_`))
        .forEach(([key, color]) => {
          const parts = key.split('_');
          const columnKey = parts.slice(2).join('_');
          cellColorsForRow[columnKey] = color;
        });

      return {
        row_number: row.number,
        row_index: index,
        data: rowDataOnly,
        cell_colors: Object.keys(cellColorsForRow).length > 0 ? cellColorsForRow : null
      };
    });

    // Отправляем данные на API
    const response = await fetch(`${API_BASE_URL}/api/risk-tables/project/${projectId}/sheets/${sheetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sheet_name: customSheetNames[sheetId] || null,
        sheet_icon: sheets.find(s => s.id === sheetId)?.icon || null,
        columns: columnDefinitions,
        rows: rowData
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  };

  const performSave = async () => {
    setSaving(true);
    try {
      // Подготавливаем данные для отправки на API
      const columnDefinitions = columns.map((col, index) => ({
        key: col.key,
        label: col.label,
        width: col.width,
        column_index: index
      }));

      const rowData = data.map((row, index) => {
        // Извлекаем данные строки, исключая вспомогательные поля
        const rowDataOnly = { ...row };
        delete rowDataOnly.number;
        delete rowDataOnly.id;
        delete rowDataOnly.isNew;
        delete rowDataOnly.cell_colors;

        // Получаем цвета ячеек для конкретной строки
        const cellColorsForRow = {};
        Object.entries(cellColors)
          .filter(([key, color]) => key.startsWith(`${activeSheet}_${index}_`))
          .forEach(([key, color]) => {
            const parts = key.split('_');
            const columnKey = parts.slice(2).join('_');
            cellColorsForRow[columnKey] = color;
          });

        return {
          row_number: row.number,
          row_index: index,
          data: rowDataOnly,
          cell_colors: Object.keys(cellColorsForRow).length > 0 ? cellColorsForRow : null
        };
      });

      // Отправляем данные на API без авторизации (тест)
      const response = await fetch(`${API_BASE_URL}/api/risk-tables/project/${projectId}/sheets/${activeSheet}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          sheet_name: customSheetNames[activeSheet] || null,
          sheet_icon: sheets.find(s => s.id === activeSheet)?.icon || null,
          columns: columnDefinitions,
          rows: rowData
        }),
      }); // Убираем Authorization header

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Сохраняем настройки UI в localStorage (пока оставляем для совместимости)
      localStorage.setItem(`project_${projectId}_sheet_names`, JSON.stringify(customSheetNames));
      localStorage.setItem(`project_${projectId}_column_labels`, JSON.stringify(customColumnLabels));
      localStorage.setItem(`project_${projectId}_custom_sheets`, JSON.stringify(customSheets));
      localStorage.setItem(`project_${projectId}_column_widths`, JSON.stringify(columnWidths));
      localStorage.setItem(`project_${projectId}_row_heights`, JSON.stringify(rowHeights));

      // Сбрасываем состояние изменений для текущего листа
      setHasChanges(false);
      setModifiedCells(new Set());

      // Очищаем глобальное отслеживание изменений для текущего листа
      const updatedAllSheetsChanges = { ...allSheetsChanges };
      delete updatedAllSheetsChanges[activeSheet];
      setAllSheetsChanges(updatedAllSheetsChanges);
      localStorage.setItem(`project_${projectId}_all_sheet_changes`, JSON.stringify(updatedAllSheetsChanges));

      // Очищаем данные текущего листа из localStorage
      const updatedCurrentSheetData = { ...currentSheetData };
      delete updatedCurrentSheetData[activeSheet];
      setCurrentSheetData(updatedCurrentSheetData);
      localStorage.setItem(`project_${projectId}_current_sheet_data`, JSON.stringify(updatedCurrentSheetData));

      alert('Данные успешно сохранены на сервере!');

      // Перезагружаем данные с сервера, чтобы обновить цвета и другие изменения
      await loadData();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Ошибка при сохранении данных. Проверьте подключение к серверу.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewRow = () => {
    // Запрещаем добавление строк в автоматически управляемых листах
    if (isAutoManagedSheet()) {
      alert('⚠️ Нельзя добавлять строки вручную в этом листе.\nСтроки добавляются автоматически при создании рисков в Risk Analysis.');
      return;
    }

    const newRow = { number: data.length + 1, id: null, isNew: true };
    columns.forEach(col => {
      if (col.key !== 'number') {
        newRow[col.key] = '';
      }
    });
    setData([...data, newRow]);
    setHasChanges(true);

    // Помечаем новую строку как измененную
    columns.forEach(col => {
      if (col.key !== 'number') {
        const cellKey = `${activeSheet}_${data.length}_${col.key}`;
        setModifiedCells(prev => new Set([...prev, cellKey]));
      }
    });
  };

  const handleAddNewColumn = () => {
    // Запрещаем добавление столбцов в автоматически управляемых листах
    if (isAutoManagedSheet()) {
      alert('⚠️ Нельзя добавлять столбцы вручную в этом листе.\nСтолбцы управляются автоматически из Risk Analysis.');
      return;
    }
    
    const columnName = prompt('Введите название нового столбца:', 'Новый столбец');
    if (!columnName || !columnName.trim()) return;

    const newColumnKey = `custom_col_${Date.now()}`;

    // Добавляем пользовательское название столбца
    const customKey = `${activeSheet}_${newColumnKey}`;
    const newCustomLabels = {
      ...customColumnLabels,
      [customKey]: columnName.trim()
    };
    setCustomColumnLabels(newCustomLabels);
    localStorage.setItem(`project_${projectId}_column_labels`, JSON.stringify(newCustomLabels));

    // Добавляем новую колонку во все строки
    const newData = data.map(row => ({
      ...row,
      [newColumnKey]: ''
    }));

    setData(newData);
    setHasChanges(true);

    // Помечаем все ячейки новой колонки как измененные
    data.forEach((_, rowIndex) => {
      const cellKey = `${activeSheet}_${rowIndex}_${newColumnKey}`;
      setModifiedCells(prev => new Set([...prev, cellKey]));
    });
  };

  const handleDeleteColumn = (columnKey) => {
    // Запрещаем удаление столбцов в автоматически управляемых листах
    if (isAutoManagedSheet()) {
      alert('⚠️ Нельзя удалять столбцы вручную в этом листе.\nСтолбцы управляются автоматически из Risk Analysis.');
      setShowDeleteColumn(null);
      return;
    }
    
    if (!window.confirm('Удалить этот столбец?')) return;
    
    // Удаляем колонку из всех строк
    const newData = data.map(row => {
      const newRow = { ...row };
      delete newRow[columnKey];
      return newRow;
    });
    
    // Удаляем пользовательское название столбца
    const customKey = `${activeSheet}_${columnKey}`;
    const newCustomLabels = { ...customColumnLabels };
    delete newCustomLabels[customKey];
    setCustomColumnLabels(newCustomLabels);
    localStorage.setItem(`project_${projectId}_column_labels`, JSON.stringify(newCustomLabels));
    
    // Удаляем ширину столбца
    const widthKey = `${activeSheet}_${columnKey}`;
    const newWidths = { ...columnWidths };
    delete newWidths[widthKey];
    setColumnWidths(newWidths);
    
    setData(newData);
    setShowDeleteColumn(null);
    setHasChanges(true);
  };

  const handleDeleteRow = (rowIndex) => {
    // Запрещаем удаление строк в автоматически управляемых листах
    if (isAutoManagedSheet()) {
      alert('⚠️ Нельзя удалять строки вручную в этом листе.\nСтроки удаляются автоматически при удалении рисков из Risk Analysis.');
      setShowDeleteRow(null);
      return;
    }
    
    if (!window.confirm('Удалить эту строку?')) return;
    
    // Удаляем строку и пересчитываем номера
    const newData = data.filter((_, index) => index !== rowIndex).map((row, index) => ({
      ...row,
      number: index + 1
    }));
    
    setData(newData);
    setShowDeleteRow(null);
    setHasChanges(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    }
  };

  const getRiskLevelColor = (score) => {
    if (score >= 16) return '#FF0000'; // Красный - высокий риск
    if (score >= 8) return '#FFA500';  // Оранжевый - средний риск
    if (score >= 4) return '#FFFF00';  // Желтый - низкий риск
    return '#00FF00';                   // Зеленый - минимальный риск
  };

  // Получить отображаемое название роли (в том же стиле, что и на дашборде)
  const getRoleDisplayName = (role) => {
    const roleConfig = {
      admin: 'ADMIN',
      manager: 'MANAGER',
      doctor: 'DOCTOR',
      product_manager: 'PRODUCT MANAGER',
      risk_assessment_team_leader: 'RISK ASSESSMENT TEAM LEADER',
      quality_management_representative: 'QUALITY MANAGMENT REPRESENTATIVE',
      risk_assessment_team_member: 'RISK ASSESSMENT TEAM MEMBER'
    };
    return roleConfig[role] || (role?.toUpperCase() || 'UNKNOWN');
  };

  // Получить CSS класс для роли
  const getRoleClassName = (role) => {
    const roleConfig = {
      admin: 'role-admin',
      manager: 'role-manager',
      doctor: 'role-doctor',
      product_manager: 'role-product-manager',
      risk_assessment_team_leader: 'role-risk-leader',
      quality_management_representative: 'role-quality-rep',
      risk_assessment_team_member: 'role-risk-member'
    };
    return roleConfig[role] || 'role-unknown';
  };

  // Проверить, может ли пользователь редактировать данный столбец
  const canEditColumn = (columnKey) => {
    if (['risk_level_1', 'risk_level_2', 'residual_risk_score'].includes(columnKey)) {
      return false;
    }

    // Определяем столбцы с баллами риска
    const riskScoreColumns = ['severity_score', 'probability_score', 'risk_score', 'residual_risk_level', 'residual_probability', 'residual_risk_score'];

    // Если столбец содержит баллы риска, проверяем разрешение edit_risk_values
    if (riskScoreColumns.includes(columnKey)) {
      return userPermissions.includes('edit_risk_values');
    }

    // Для остальных столбцов проверяем роль пользователя
    // Администраторы и менеджеры могут редактировать все столбцы
    return userRole === 'admin' || userRole === 'manager';
  };

  // Получить стиль для ячейки в зависимости от прав доступа
  const getCellStyle = (columnKey, cellColor) => {
    const canEdit = canEditColumn(columnKey);

    if (!canEdit) {
      // Недоступные для редактирования ячейки выделяем серым
      return {
        backgroundColor: '#f5f5f5',
        color: '#999',
        cursor: 'not-allowed',
        opacity: 0.7
      };
    }

    // Цвет фона теперь управляется только через cellColors state
    return {
      backgroundColor: 'transparent'
    };
  };

  // Проверить, может ли пользователь добавлять новые элементы
  const canAddElements = () => {
    // Только администраторы и менеджеры могут добавлять новые элементы
    return userRole !== 'doctor' && userRole !== 'guest';
  };

  // Проверить, может ли пользователь удалять элементы
  const canDeleteElements = () => {
    // Только администраторы могут удалять элементы
    return userRole === 'admin';
  };

  // Получить визуальный индикатор состояния риска
  const getRiskStatusIndicator = (row) => {
    if (!isAutoManagedSheet()) {
      return { icon: '', color: '', title: '' };
    }
    
    // Риск полностью закрыт (финальный статус)
    if (row.risk_status === 'fully_closed') {
      return { 
        icon: '🟢', 
        color: '#4CAF50', 
        title: 'Риск полностью закрыт' 
      };
    }

    // Риск закрыт после анализа остаточного риска/пользы
    if (row.risk_status === 'closed') {
      return {
        icon: '🟢',
        color: '#4CAF50',
        title: 'Риск закрыт'
      };
    }
    
    // Риск на проверке (после вторичной оценки, ожидает финального закрытия)
    if (row.risk_status === 'pending_closure') {
      return { 
        icon: '🟠', 
        color: '#FF9800', 
        title: 'Риск на проверке - ожидает финального закрытия' 
      };
    }

    if (row.risk_status === 'pending_benefit') {
      return {
        icon: '🟠',
        color: '#FF9800',
        title: 'Ожидается анализ остаточный риск/польза'
      };
    }
    
    // Первичная оценка выполнена (в работе)
    if (row.first_evaluation_done === true || row.risk_status === 'evaluated') {
      return { 
        icon: '🟡', 
        color: '#FFC107', 
        title: 'В работе - первичная оценка выполнена' 
      };
    }
    
    // Требуется первичная оценка (оценки заполнены но не подтверждены)
    const hasSeverity = row.severity_score && row.severity_score.toString().trim() !== '';
    const hasProbability = row.probability_score && row.probability_score.toString().trim() !== '';
    if (hasSeverity && hasProbability) {
      return { 
        icon: '!', 
        color: '#FF9800', 
        title: 'Требуется подтверждение оценки' 
      };
    }
    
    // Новый риск (без оценки)
    return { 
      icon: '⚪', 
      color: '#9E9E9E', 
      title: 'Новый риск - требуется оценка' 
    };
  };

  // Проверка, можно ли полностью закрыть риск
  const canCloseFully = (row) => {
    if (!isAutoManagedSheet()) return false;
    
    // Только риски со статусом pending_closure могут быть закрыты окончательно
    return row.risk_status === 'pending_closure';
  };

  // Финальное закрытие риска (с подтверждением)
  const handleFullyCloseRisk = async (rowIndex) => {
    const row = data[rowIndex];
    
    const confirmed = window.confirm(
      '⚠️ ВНИМАНИЕ!\n\n' +
      'После закрытия риска вы НЕ сможете изменить какие-либо данные в этой строке.\n\n' +
      `Риск: ${row.hazard_name || 'Без названия'}\n` +
      `Категория: ${row.hazard_category || '-'}\n\n` +
      'Вы уверены, что хотите закрыть этот риск окончательно?'
    );
    
    if (!confirmed) return;
    
    // Сохраняем текущие данные для отката в случае ошибки
    const oldData = [...data];
    
    // Обновляем статус риска
    const newData = [...data];
    newData[rowIndex] = {
      ...newData[rowIndex],
      risk_status: 'fully_closed',
      is_closed: true, // Полная блокировка всех полей
      closed_by: JSON.parse(localStorage.getItem('user') || '{}').id,
      closed_timestamp: new Date().toISOString()
    };
    
    setData(newData);
    setHasChanges(true);
    
    // Сразу сохраняем изменения в БД
    setSaving(true);
    try {
      // Подготавливаем данные для отправки
      const columnDefinitions = columns.map((col, index) => ({
        key: col.key,
        label: col.label,
        width: col.width,
        column_index: index
      }));

      const rowData = newData.map((row, index) => {
        const rowDataOnly = { ...row };
        delete rowDataOnly.number;
        delete rowDataOnly.id;
        delete rowDataOnly.isNew;
        delete rowDataOnly.cell_colors;

        const cellColorsForRow = {};
        Object.entries(cellColors)
          .filter(([key, color]) => key.startsWith(`${activeSheet}_${index}_`))
          .forEach(([key, color]) => {
            const parts = key.split('_');
            const columnKey = parts.slice(2).join('_');
            cellColorsForRow[columnKey] = color;
          });

        return {
          row_number: row.number,
          row_index: index,
          data: rowDataOnly,
          cell_colors: Object.keys(cellColorsForRow).length > 0 ? cellColorsForRow : null
        };
      });

      const response = await fetch(`${API_BASE_URL}/api/risk-tables/project/${projectId}/sheets/${activeSheet}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheet_name: customSheetNames[activeSheet] || null,
          columns: columnDefinitions,
          rows: rowData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      alert(`✓ Риск "${row.hazard_name || 'Без названия'}" успешно закрыт окончательно!`);
      setHasChanges(false);
      
      // Обновляем snapshot
      setDataBeforeChanges({
        data: JSON.parse(JSON.stringify(newData)),
        cellColors: { ...cellColors }
      });
    } catch (error) {
      console.error('Failed to close risk:', error);
      alert('Ошибка при закрытии риска. Попробуйте еще раз.');
      // Откатываем изменения при ошибке
      setData(oldData);
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (row, column, rowIndex) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnKey === column.key;
    let value = row[column.key] || '';
    const cellColor = getCellColor(rowIndex, column.key);
    const canEdit = canEditColumn(column.key);
    const cellStyle = getCellStyle(column.key, cellColor);
    const isLocked = isCellLocked(rowIndex, column.key);

    // Автоматическое определение уровня риска для столбцов risk_level_1 и risk_level_2
    if ((column.key === 'risk_level_1' || column.key === 'risk_level_2') && !isEditing) {
      const riskScore = column.key === 'risk_level_1'
        ? (parseInt(row.risk_score) || 0)
        : (parseInt(row.residual_risk_score) || 0);

      if (riskScore >= acceptableRiskLevel) {
        value = 'не допустимый';
        // Автоматически устанавливаем красный цвет для не допустимого риска
        if (cellColor !== '#FF4444') {
          handleCellColorChange(rowIndex, column.key, '#FF4444');
        }
      } else if (riskScore > 0 && riskScore < acceptableRiskLevel) {
        value = 'допустимый';
        // Автоматически устанавливаем зеленый цвет для допустимого риска
        if (cellColor !== '#4CAF50') {
          handleCellColorChange(rowIndex, column.key, '#4CAF50');
        }
      } else if (riskScore === 0) {
        value = '';
        // Для нулевого риска устанавливаем белый цвет
        if (cellColor !== '#FFFFFF') {
          handleCellColorChange(rowIndex, column.key, '#FFFFFF');
        }
      }
    }

    // Проверяем, является ли ячейка измененной
    const cellKey = `${activeSheet}_${rowIndex}_${column.key}`;
    const isModified = modifiedCells.has(cellKey);

    // Определяем стиль для всей ячейки
    const cellBackgroundStyle = cellColor && cellColor !== '#FFFFFF' ? { backgroundColor: cellColor } : {};

    return (
      <div
        className="excel-cell-wrapper"
        style={{
          height: '100%',
          width: '100%',
          position: 'relative',
          backgroundColor: isLocked ? '#f0f0f0' : 'transparent'
        }}
      >
        {isEditing && canEdit && !isLocked ? (
          column.key === 'new_risks' ? (
            // Special handling for new_risks: show choice selector + optional text input
            <div style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <select
                className="excel-cell-input"
                value={value.startsWith('да:') ? 'да' : value.startsWith('нет') ? 'нет' : ''}
                onChange={(e) => {
                  const choice = e.target.value;
                  if (choice === 'да') {
                    // If switching to "да", preserve any existing comment
                    const existingComment = value.startsWith('да:') ? value.substring(3) : '';
                    handleCellChange(rowIndex, column.key, `да:${existingComment}`);
                  } else if (choice === 'нет') {
                    handleCellChange(rowIndex, column.key, 'нет');
                  } else {
                    handleCellChange(rowIndex, column.key, '');
                  }
                }}
                style={{
                  backgroundColor: 'transparent',
                  width: '100%',
                  flex: value.startsWith('да:') ? '0 0 40%' : '1',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  padding: '12px 8px',
                  border: 'none',
                  boxSizing: 'border-box',
                  zIndex: 3
                }}
              >
                <option value="">—</option>
                <option value="да">да</option>
                <option value="нет">нет</option>
              </select>
              {value.startsWith('да:') && (
                <textarea
                  className="excel-cell-input"
                  value={value.substring(3)} // Remove "да:" prefix
                  onChange={(e) => {
                    const comment = e.target.value;
                    handleCellChange(rowIndex, column.key, `да:${comment}`);
                  }}
                  onBlur={handleCellBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="Комментарий..."
                  style={{
                    backgroundColor: 'transparent',
                    width: '100%',
                    flex: '1',
                    padding: '8px',
                    border: 'none',
                    resize: 'none',
                    fontSize: '12px',
                    zIndex: 2
                  }}
                />
              )}
            </div>
          ) : column.key === 'risk_benefit_analysis' ? (
            <select
              className="excel-cell-input"
              value={value}
              onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
              onBlur={handleCellBlur}
              autoFocus
              style={{
                backgroundColor: 'transparent',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 2
              }}
            >
              <option value="">—</option>
              <option value="да">да</option>
              <option value="нет">нет</option>
            </select>
          ) : (
            <input
              type="text"
              className="excel-cell-input"
              value={value}
              onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
              onBlur={handleCellBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                backgroundColor: 'transparent',
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'normal',
                position: 'relative',
                zIndex: 2
              }}
            />
          )
        ) : (
          <div
            className="excel-cell-content"
            style={{
              ...cellStyle,
              backgroundColor: 'transparent',
              position: 'relative',
              zIndex: 2,
              cursor: isLocked ? 'not-allowed' : 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Не позволяем редактировать заблокированные ячейки
              if (isLocked) {
                return;
              }
              // Одинарный клик для редактирования только если пользователь может редактировать
              if (!isEditing && canEdit) {
                handleCellDoubleClick(rowIndex, column.key);
              }
              // Всегда устанавливаем выбранную ячейку для палитры цветов
              setSelectedCell({ rowIndex, columnKey: column.key });
            }}
            title={isLocked ? (row.new_risks && row.new_risks.startsWith('нет') && column.key === 'new_risks' ? 'Выбрано "нет" - редактирование заблокировано' : 'Эта ячейка управляется из Risk Analysis') : ''}
          >
            {column.key === 'new_risks' && value.startsWith('да:') ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  left: '2px',
                  fontSize: '11px',
                  color: '#666',
                  fontWeight: 'bold'
                }}>
                  да
                </span>
                <div style={{
                  padding: '18px 4px 4px 4px',
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}>
                  {value.substring(3) || ''}
                </div>
              </div>
            ) : (
              value || ''
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="excel-table-modal">
        <div className="excel-table-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Загрузка данных...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="excel-table-modal">
      <div className="excel-table-container">
        {/* Панель инструментов */}
        <div className="excel-toolbar">
          <div className="excel-toolbar-left">
            <h2>Таблица управления рисками</h2>
            {hasChanges && (
              <span className="changes-indicator">
                ● {modifiedCells.size} несохранен{modifiedCells.size === 1 ? 'ная' : modifiedCells.size < 5 ? 'ные' : 'ных'} изменени{modifiedCells.size === 1 ? 'е' : 'й'}
              </span>
            )}
          </div>
          <div className="excel-toolbar-center">
            {/* Индикатор роли пользователя */}
            {userRole && !loadingRole && (
              <div className="user-role-indicator">
                <span className="role-label">Ваша роль:</span>
                <span
                  className={`role-badge ${getRoleClassName(userRole)}`}
                  title={getRoleDisplayName(userRole)}
                >
                  {getRoleDisplayName(userRole)}
                </span>
              </div>
            )}
            {loadingRole && (
              <div className="user-role-indicator">
                <span className="role-label">Загрузка роли...</span>
              </div>
            )}
          </div>
          <div className="excel-toolbar-right">
            {/* Палитра цветов - не показываем для заблокированных ячеек */}
            {selectedCell && !isCellLocked(selectedCell.rowIndex, selectedCell.columnKey) && (
              <div className="toolbar-color-picker">
                <span className="color-picker-label">Цвет ячейки:</span>
                <div
                  className="toolbar-color-option color-reset-btn"
                  style={{ backgroundColor: '#FFFFFF', border: '2px solid #ccc' }}
                  onClick={() => {
                    handleCellColorChange(selectedCell.rowIndex, selectedCell.columnKey, '#FFFFFF');
                    setSelectedCell(null);
                  }}
                  title="Сбросить цвет"
                >
                  Сброс
                </div>
                {colors.map(color => (
                  <div
                    key={color.value}
                    className="toolbar-color-option"
                    style={{ backgroundColor: color.value }}
                    onClick={() => {
                      handleCellColorChange(selectedCell.rowIndex, selectedCell.columnKey, color.value);
                      setSelectedCell(null);
                    }}
                    title={color.name}
                  />
                ))}
              </div>
            )}
            <button
              className="excel-btn excel-btn-save"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              className="excel-btn excel-btn-close"
              onClick={() => {
                if (hasChanges) {
                  const confirmClose = window.confirm(
                    'У вас есть несохраненные изменения. Вы действительно хотите закрыть таблицу без сохранения?'
                  );
                  if (confirmClose) {
                    onClose();
                  }
                } else {
                  onClose();
                }
              }}
            >
              Закрыть
            </button>
          </div>
        </div>

        {/* Вкладки листов */}
        <div className="excel-tabs">
          {sheets.map(sheet => {
            const sheetChanges = allSheetsChanges[sheet.id]?.size || 0;
            return (
              <div
                key={sheet.id}
                className={`excel-tab ${activeSheet === sheet.id ? 'active' : ''}`}
                onClick={() => {
                  // Проверяем изменения в текущем листе перед переключением
                  if (hasChanges && activeSheet !== sheet.id) {
                    const confirmSwitch = window.confirm(
                      'У вас есть несохраненные изменения в текущем листе. Переключение на другой лист отменит эти изменения. Продолжить?'
                    );
                    if (!confirmSwitch) return;
                  }
                  setActiveSheet(sheet.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleSheetDoubleClick(sheet.id);
                }}
              >
                <span className="tab-icon">{sheet.icon}</span>
                {editingSheetId === sheet.id ? (
                  <input
                    type="text"
                    className="sheet-name-input"
                    value={editingSheetName}
                    onChange={(e) => setEditingSheetName(e.target.value)}
                    onBlur={handleSheetNameSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSheetNameSave();
                      } else if (e.key === 'Escape') {
                        setEditingSheetId(null);
                        setEditingSheetName('');
                      }
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="tab-name">{getSheetName(sheet.id)}</span>
                )}

                {/* Кнопка удаления для пользовательских листов */}
                {sheet.id.startsWith('custom_sheet_') && (
                  <button
                    className="delete-sheet-btn"
                    onClick={(e) => handleDeleteSheet(sheet.id, e)}
                    title="Удалить лист"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          
          {/* Кнопка добавления нового листа */}
          {canAddElements() && (
            <button
              className="excel-tab add-sheet-btn"
              onClick={handleAddNewSheet}
              title="Добавить новый лист"
            >
              <span className="tab-icon">+</span>
            </button>
          )}
        </div>



        {/* Таблица */}
        <div className="excel-table-scroll">
          <table className="excel-table">
            <thead>
              {/* Ряд с буквами столбцов */}
              <tr className="column-letters-row">
                <th className="row-number-header"></th>
                {columns.map((column, index) => (
                  <th 
                    key={`letter-${column.key}`} 
                    className={`column-letter ${showDeleteColumn === column.key ? 'show-delete' : ''}`}
                    style={{ width: getColumnWidth(column.key), minWidth: '60px' }}
                    onClick={() => setShowDeleteColumn(showDeleteColumn === column.key ? null : column.key)}
                  >
                    {getColumnLetter(index)}
                    {!isAutoManagedSheet() && canDeleteElements() ? (
                      <button
                        className="delete-column-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteColumn(column.key);
                          setShowDeleteColumn(null);
                        }}
                        title="Удалить столбец"
                      >
                        ×
                      </button>
                    ) : (
                      <div style={{ width: '20px', height: '20px' }}></div>
                    )}
                    <div 
                      className="column-letter-resizer"
                      onMouseDown={(e) => handleColumnResizeStart(column.key, e)}
                    />
                  </th>
                ))}
                <th className="add-column-cell">
                  {isAutoManagedSheet() ? (
                    <div style={{ padding: '8px', textAlign: 'center', color: '#999', fontSize: '11px' }}>
                      🔒 Управляется из Risk Analysis
                    </div>
                  ) : canAddElements() ? (
                    <button className="add-column-btn" onClick={handleAddNewColumn} title="Добавить столбец">
                      ➕
                    </button>
                  ) : (
                    <div style={{ padding: '8px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                      Нет прав
                    </div>
                  )}
                </th>
              </tr>

              {/* Иерархические заголовки столбцов */}
              {renderHierarchicalHeaders()}
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} style={{ height: getRowHeight(rowIndex) }}>
                  <td 
                    className={`row-number-cell ${showDeleteRow === rowIndex ? 'show-delete' : ''}`}
                    style={{ position: 'relative' }}
                    onClick={() => setShowDeleteRow(showDeleteRow === rowIndex ? null : rowIndex)}
                  >
                    <div className="row-number-content">
                      {/* Индикатор состояния риска */}
                      {(() => {
                        const indicator = getRiskStatusIndicator(row);
                        return indicator.icon ? (
                          <span 
                            className="risk-status-indicator" 
                            style={{ color: indicator.color }}
                            title={indicator.title}
                          >
                            {indicator.icon}
                          </span>
                        ) : null;
                      })()}
                      {row.number}
                      
                      {/* Кнопка финального закрытия риска */}
                      {canCloseFully(row) ? (
                        <button
                          className="close-risk-fully-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFullyCloseRisk(rowIndex);
                          }}
                          title="Закрыть риск окончательно"
                        >
                          ✓
                        </button>
                      ) : !isAutoManagedSheet() && canDeleteElements() ? (
                        <button
                          className="delete-row-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRow(rowIndex);
                            setShowDeleteRow(null);
                          }}
                          title="Удалить строку"
                        >
                          ×
                        </button>
                      ) : (
                        <div style={{ width: '20px', height: '20px' }}></div>
                      )}
                    </div>
                    <div 
                      className="row-resizer"
                      onMouseDown={(e) => handleRowResizeStart(rowIndex, e)}
                    />
                  </td>
                  {columns.map(column => {
                    const cellKey = `${activeSheet}_${rowIndex}_${column.key}`;
                    const cellColor = cellColors[cellKey];
                    const cellBgColor = cellColor && cellColor !== '#FFFFFF' ? cellColor : 'transparent';
                    const isModified = modifiedCells.has(cellKey);

                    return (
                      <td
                        key={column.key}
                        className={`editable ${isModified ? 'modified-cell' : ''}`}
                        style={{
                          width: getColumnWidth(column.key),
                          minWidth: '60px',
                          backgroundColor: cellBgColor
                        }}
                      >
                        <div className="excel-cell-wrapper">
                          {renderCell(row, column, rowIndex)}
                        </div>
                      </td>
                    );
                  })}
                  <td></td>
                </tr>
              ))}
              {/* Строка с кнопкой добавления */}
              <tr>
                <td className="add-row-cell">
                  {isAutoManagedSheet() ? (
                    <div style={{ padding: '8px', textAlign: 'center', color: '#999', fontSize: '11px' }}>
                      🔒 Управляется из Risk Analysis
                    </div>
                  ) : canAddElements() ? (
                    <button className="add-row-btn-icon" onClick={handleAddNewRow} title="Добавить строку">
                      ➕
                    </button>
                  ) : (
                    <div style={{ padding: '8px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                      Нет прав
                    </div>
                  )}
                </td>
                {columns.map(column => (
                  <td key={`add-${column.key}`}></td>
                ))}
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Batch Risk Evaluation Modal */}
      {showBatchEvaluation && risksToEvaluate.length > 0 && (
        <BatchRiskEvaluation
          risks={risksToEvaluate}
          acceptableRiskLevel={acceptableRiskLevel}
          onComplete={async (evaluations, cancelledRiskIndices = []) => {
            // Восстанавливаем данные для отмененных рисков из snapshot (откат изменений)
            restoreDataForCancelledRisks(cancelledRiskIndices);
            // Применяем оценки для НЕ отмененных рисков
            applyEvaluations(evaluations);
            // Сохраняем данные
            await performSave();
            // Закрываем modal только после успешного сохранения
            setShowBatchEvaluation(false);
            setRisksToEvaluate([]);
          }}
          onCancel={() => {
            // При отмене оценки просто закрываем модальное окно без восстановления данных
            // Значения в ячейках остаются как есть
            setShowBatchEvaluation(false);
            setRisksToEvaluate([]);
            setSaving(false);
          }}
        />
      )}
    </div>
  );
};

export default ExcelTable;
