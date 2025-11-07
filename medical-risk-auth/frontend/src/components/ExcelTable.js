import React, { useState, useEffect, useMemo } from 'react';
import './ExcelTable.css';
import RiskEvaluationWizard from './RiskEvaluationWizard';
import BatchRiskEvaluation from './BatchRiskEvaluation';

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
  const [loadingRole, setLoadingRole] = useState(true);
  
  // Состояние для оценки рисков
  const [showBatchEvaluation, setShowBatchEvaluation] = useState(false);
  const [risksToEvaluate, setRisksToEvaluate] = useState([]);
  
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
        { id: 'sheet5', name: '14931', icon: '' },
        { id: 'sheet6', name: 'Определения 62366', icon: '' },
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
        { id: 'sheet5', name: '14931', icon: '' },
        { id: 'sheet6', name: 'Определения 62366', icon: '' },
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
    
    // Если риск закрыт - все ячейки заблокированы
    if (row.is_closed === true) {
      return true;
    }
    
    // Если выполнена вторичная оценка и она не допустима - блокируем столбцы 1-20
    if (row.locked_after_second === true) {
      const lockedUntilColumn20 = [
        'hazard_category', 'hazard_name', 'event_sequence', 'hazardous_situation', 'harm',
        'severity_score', 'probability_score', 'risk_score', 'risk_level_1', 'comment_1',
        'control_measure_1', 'control_measure_2', 'control_measure_3',
        'verification_1', 'verification_2', 'verification_3',
        'residual_risk_level', 'residual_probability', 'residual_risk_score', 'risk_level_2', 'comment_2'
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
  }, [projectId]);

  // Обновление активного листа при изменении initialSheet
  useEffect(() => {
    if (initialSheet) {
      setActiveSheet(initialSheet);
    }
  }, [initialSheet]);

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
      const response = await fetch(`http://localhost:8000/api/projects/${projectId}/my-role`, {
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
      const response = await fetch(`http://localhost:8000/api/risk-tables/project/${projectId}/sheets/${activeSheet}`); // Убираем Authorization header

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
        setCellColors(formattedData.reduce((acc, row, index) => {
          if (row.cell_colors) {
            Object.entries(row.cell_colors).forEach(([colKey, color]) => {
              acc[`${activeSheet}_${index}_${colKey}`] = color;
            });
          }
          return acc;
        }, {}));
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

  const handleCellChange = (rowIndex, columnKey, value) => {
    // Валидация для столбцов с ограничением 0-10
    if (columnKey === 'severity_score' || columnKey === 'probability_score') {
      // Разрешаем только цифры
      const numericValue = value.replace(/[^0-9]/g, '');

      // Ограничиваем диапазон 0-10
      const numValue = parseInt(numericValue);
      if (numericValue !== '' && (isNaN(numValue) || numValue < 0 || numValue > 10)) {
        alert(`Значение для "${columnKey === 'severity_score' ? 'Тяжесть вреда' : 'Вероятность причинения вреда'}" должно быть цифрой в диапазоне 0-10`);
        return;
      }

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

    // Автоматический расчет риска
    if (columnKey === 'severity_score' || columnKey === 'probability_score') {
      const severity = parseInt(newData[rowIndex].severity_score) || 0;
      const probability = parseInt(newData[rowIndex].probability_score) || 0;
      newData[rowIndex].risk_score = severity * probability;
    }

    // Автоматический расчет остаточного риска
    if (columnKey === 'residual_risk_level' || columnKey === 'residual_probability') {
      const severity = parseInt(newData[rowIndex].residual_risk_level) || 0;
      const probability = parseInt(newData[rowIndex].residual_probability) || 0;
      const residualScore = severity * probability;
      newData[rowIndex].residual_risk_score = residualScore;
    }

    setData(newData);

    // Отслеживаем измененные ячейки
    const cellKey = `${activeSheet}_${rowIndex}_${columnKey}`;
    setModifiedCells(prev => new Set([...prev, cellKey]));

    setHasChanges(true);
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
      // Пропускаем закрытые риски
      if (row.is_closed === true) {
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
        // Первичная оценка
        row.first_evaluation_done = true;
        row.evaluation_timestamp = now;
        row.evaluated_by = currentUserId;
        
        // Устанавливаем уровень риска и цвет
        const riskLevelColumn = 'risk_level_1';
        const commentColumn = 'comment_1';
        
        if (evaluation.isAcceptable) {
          row[riskLevelColumn] = 'Доп';
          newCellColors[`${activeSheet}_${rowIndex}_${riskLevelColumn}`] = '#4CAF50'; // Зеленый
        } else {
          row[riskLevelColumn] = 'Не доп';
          newCellColors[`${activeSheet}_${rowIndex}_${riskLevelColumn}`] = '#FF4444'; // Красный
        }
        
        // Добавляем комментарий если есть
        if (evaluation.comment) {
          row[commentColumn] = evaluation.comment;
        }
        
        // Если риск закрыт
        if (evaluation.shouldCloseRisk) {
          row.is_closed = true;
          row.risk_status = 'closed';
        } else {
          row.risk_status = 'evaluated';
        }
      } else if (evaluation.evaluationType === 'second') {
        // Вторичная оценка
        row.second_evaluation_done = true;
        row.evaluation_timestamp = now;
        row.evaluated_by = currentUserId;
        
        // Устанавливаем уровень остаточного риска и цвет
        const riskLevelColumn = 'risk_level_2';
        const commentColumn = 'comment_2';
        const newRisksColumn = 'new_risks';
        
        if (evaluation.isAcceptable) {
          row[riskLevelColumn] = 'Доп';
          newCellColors[`${activeSheet}_${rowIndex}_${riskLevelColumn}`] = '#4CAF50'; // Зеленый
          row.risk_status = 'completed';
        } else {
          row[riskLevelColumn] = 'Не доп';
          newCellColors[`${activeSheet}_${rowIndex}_${riskLevelColumn}`] = '#FF4444'; // Красный
          // Блокируем столбцы 1-20
          row.locked_after_second = true;
        }
        
        // Добавляем комментарий если есть
        if (evaluation.comment) {
          row[commentColumn] = evaluation.comment;
        }
        
        // Если созданы новые риски
        if (evaluation.shouldCreateNewRisk && evaluation.newRiskDescription) {
          row[newRisksColumn] = evaluation.newRiskDescription;
          newCellColors[`${activeSheet}_${rowIndex}_${newRisksColumn}`] = '#FF4444'; // Красный
        }
      }
    });
    
    setData(newData);
    setCellColors(newCellColors);
  };

  const handleSave = async () => {
    // Проверяем, есть ли риски требующие оценки
    const risksNeedingEval = findRisksNeedingEvaluation();
    
    if (risksNeedingEval.length > 0) {
      // Показываем batch evaluation
      setRisksToEvaluate(risksNeedingEval);
      setShowBatchEvaluation(true);
      return; // Не продолжаем сохранение, пока не будет оценка
    }
    
    // Продолжаем обычное сохранение
    await performSave();
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
      const response = await fetch(`http://localhost:8000/api/risk-tables/project/${projectId}/sheets/${activeSheet}`, {
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

      alert('Данные успешно сохранены на сервере!');
      setHasChanges(false);
      setModifiedCells(new Set());
      
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
    
    const cols = getColumns(activeSheet);
    const newRow = { number: data.length + 1, id: null, isNew: true };
    cols.forEach(col => {
      if (col.key !== 'number') {
        newRow[col.key] = '';
      }
    });
    setData([...data, newRow]);
    setHasChanges(true);

    // Помечаем новую строку как измененную
    cols.forEach(col => {
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

  // Получить отображаемое название роли
  const getRoleDisplayName = (role) => {
    switch(role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      case 'doctor': return 'Врач';
      case 'guest': return 'Гость';
      default: return 'Неизвестная роль';
    }
  };

  // Получить цвет для роли
  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return '#FF4444';     // Красный для администратора
      case 'manager': return '#FF8800';   // Оранжевый для менеджера
      case 'doctor': return '#4444FF';    // Синий для врача
      case 'guest': return '#888888';     // Серый для гостя
      default: return '#666666';          // Серый по умолчанию
    }
  };

  // Проверить, может ли пользователь редактировать данный столбец
  const canEditColumn = (columnKey) => {
    // Пользователи с ролью DOCTOR могут редактировать только определенные столбцы
    if (userRole === 'doctor') {
      const editableColumns = ['severity_score', 'probability_score', 'risk_score'];
      return editableColumns.includes(columnKey);
    }
    // Администраторы и менеджеры могут редактировать все столбцы
    return true;
  };

  // Получить стиль для ячейки в зависимости от прав доступа
  const getCellStyle = (columnKey, cellColor) => {
    const canEdit = canEditColumn(columnKey);

    if (!canEdit && userRole === 'doctor') {
      // Для пользователей DOCTOR недоступные для редактирования ячейки выделяем серым
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
    
    // Риск закрыт
    if (row.is_closed === true) {
      return { 
        icon: '🔒', 
        color: '#9E9E9E', 
        title: 'Риск закрыт - редактирование недоступно' 
      };
    }
    
    // Риск полностью обработан (вторичная оценка выполнена и допустима)
    if (row.risk_status === 'completed' || row.second_evaluation_done === true) {
      return { 
        icon: '✓✓', 
        color: '#4CAF50', 
        title: 'Риск полностью обработан' 
      };
    }
    
    // Вторичная оценка не допустима (столбцы 1-20 заблокированы)
    if (row.locked_after_second === true) {
      return { 
        icon: '⚠', 
        color: '#FF9800', 
        title: 'Остаточный риск не допустим - требуются дополнительные меры' 
      };
    }
    
    // Первичная оценка выполнена
    if (row.first_evaluation_done === true || row.risk_status === 'evaluated') {
      return { 
        icon: '✓', 
        color: '#2196F3', 
        title: 'Первичная оценка выполнена' 
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
      icon: '', 
      color: '', 
      title: 'Новый риск - требуется оценка' 
    };
  };

  const renderCell = (row, column, rowIndex) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnKey === column.key;
    const value = row[column.key] || '';
    const cellColor = getCellColor(rowIndex, column.key);
    const canEdit = canEditColumn(column.key);
    const cellStyle = getCellStyle(column.key, cellColor);
    const isLocked = isCellLocked(rowIndex, column.key);

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
            title={isLocked ? 'Эта ячейка управляется из Risk Analysis' : ''}
          >
            {value || ''}
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
            {hasChanges && <span className="changes-indicator">● Есть несохраненные изменения</span>}
          </div>
          <div className="excel-toolbar-center">
            {/* Индикатор роли пользователя */}
            {userRole && !loadingRole && (
              <div className="user-role-indicator">
                <span className="role-label">Ваша роль:</span>
                <span
                  className="role-badge"
                  style={{ backgroundColor: getRoleColor(userRole) }}
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
          {sheets.map(sheet => (
            <div
              key={sheet.id}
              className={`excel-tab ${activeSheet === sheet.id ? 'active' : ''}`}
              onClick={() => setActiveSheet(sheet.id)}
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
          ))}
          
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

        {/* Информационный баннер для листов с рисками */}
        {isAutoManagedSheet() && (
          <div style={{
            backgroundColor: '#E3F2FD',
            padding: '12px 20px',
            margin: '10px 0',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            color: '#1976D2',
            border: '1px solid #90CAF9'
          }}>
            <span>ℹ️</span>
            <div>
              <strong>Автоматическое управление:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px', lineHeight: '1.6' }}>
                <li>Первые 5 столбцов (отмечены 🔒): Категория опасности, Наименование опасности, Последовательность событий, Опасная ситуация, Вред - заполняются автоматически из Risk Analysis</li>
                <li>Строки добавляются и удаляются автоматически при изменении рисков в Risk Analysis</li>
                <li>Вы можете редактировать остальные столбцы для добавления оценок и мер контроля</li>
              </ul>
            </div>
          </div>
        )}

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
                      {!isAutoManagedSheet() && canDeleteElements() ? (
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
          onComplete={(evaluations) => {
            // Применяем оценки
            applyEvaluations(evaluations);
            // Закрываем modal
            setShowBatchEvaluation(false);
            setRisksToEvaluate([]);
            // Сохраняем данные
            performSave();
          }}
          onCancel={() => {
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
