import React, { useState, useEffect } from 'react';
import './ExcelTable.css';

const ExcelTable = ({ projectId, onClose }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSheet, setActiveSheet] = useState('sheet1');
  const [cellColors, setCellColors] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [columnWidths, setColumnWidths] = useState({});
  const [rowHeights, setRowHeights] = useState({});
  const [resizing, setResizing] = useState(null);
  const [showDeleteColumn, setShowDeleteColumn] = useState(null);
  const [showDeleteRow, setShowDeleteRow] = useState(null);
  
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

  // Определение всех листов из Excel файла + пользовательские
  const baseSheets = [
    { id: 'sheet1', name: 'Энергетические опасности', icon: '⚡' },
    { id: 'sheet2', name: 'Биохимические опасности', icon: '🧬' },
    { id: 'sheet3', name: 'Эксплуатационные и информ', icon: '⚙️' },
    { id: 'sheet4', name: 'Программные', icon: '💻' },
    { id: 'sheet5', name: '14931', icon: '📄' },
    { id: 'sheet6', name: 'Определения 62366', icon: '📖' },
    { id: 'sheet7', name: 'Заключения-Выводы', icon: '📝' }
  ];
  
  const sheets = [...baseSheets, ...customSheets];

  // Колонки для разных листов
  const getColumns = (sheetId) => {
    switch(sheetId) {
      case 'sheet1':
        // Энергетические опасности - 22 столбца
        return [
          { key: 'lifecycle_stage', label: 'Этап жизненного цикла изделия', width: '180px' },
          { key: 'hazard_name', label: 'Наименование опасности', width: '200px' },
          { key: 'event_sequence', label: 'Последовательность событий', width: '200px' },
          { key: 'hazardous_situation', label: 'Опасная ситуация', width: '200px' },
          { key: 'harm', label: 'Вред', width: '150px' },
          { key: 'severity_score', label: 'Тяжесть вреда, балл', width: '120px' },
          { key: 'probability_score', label: 'Вероятность причинения вреда, балл', width: '150px' },
          { key: 'risk_score', label: 'Риск, балл', width: '100px' },
          { key: 'risk_level_1', label: 'Уровень риска (доп./не доп.)', width: '150px' },
          { key: 'control_measure_1', label: 'Безопасность, заложенная в конструкции', width: '200px' },
          { key: 'control_measure_2', label: 'Защитная мера/средство', width: '180px' },
          { key: 'control_measure_3', label: 'Информация по безопасности/обучение', width: '200px' },
          { key: 'verification_1', label: 'Безопасность, заложенная в конструкции', width: '200px' },
          { key: 'verification_2', label: 'Защитная мера/средство', width: '180px' },
          { key: 'verification_3', label: 'Информация по безопасности', width: '180px' },
          { key: 'residual_risk_level', label: 'Тяжесть вреда, балл', width: '130px' },
          { key: 'residual_probability', label: 'Вероятность причинения вреда, балл', width: '150px' },
          { key: 'residual_risk_score', label: 'Достигнутый риск и его уровень', width: '180px' },
          { key: 'risk_level_2', label: 'Уровень риска (доп./не доп.)', width: '150px' },
          { key: 'risk_benefit_analysis', label: 'Анализ остаточный риск/польза', width: '200px' },
          { key: 'new_risks', label: 'Новые риски в результате принятия мер по управлению', width: '250px' }
        ];
      case 'sheet2':
      case 'sheet3':
      case 'sheet4':
        // Копии структуры sheet1 для остальных таблиц рисков
        return [
          { key: 'lifecycle_stage', label: 'Этап жизненного цикла изделия', width: '180px' },
          { key: 'hazard_name', label: 'Наименование опасности', width: '200px' },
          { key: 'event_sequence', label: 'Последовательность событий', width: '200px' },
          { key: 'hazardous_situation', label: 'Опасная ситуация', width: '200px' },
          { key: 'harm', label: 'Вред', width: '150px' },
          { key: 'severity_score', label: 'Тяжесть вреда, балл', width: '120px' },
          { key: 'probability_score', label: 'Вероятность причинения вреда, балл', width: '150px' },
          { key: 'risk_score', label: 'Риск, балл', width: '100px' },
          { key: 'risk_level_1', label: 'Уровень риска (доп./не доп.)', width: '150px' },
          { key: 'control_measure_1', label: 'Безопасность, заложенная в конструкции', width: '200px' },
          { key: 'control_measure_2', label: 'Защитная мера/средство', width: '180px' },
          { key: 'control_measure_3', label: 'Информация по безопасности/обучение', width: '200px' },
          { key: 'verification_1', label: 'Безопасность, заложенная в конструкции', width: '200px' },
          { key: 'verification_2', label: 'Защитная мера/средство', width: '180px' },
          { key: 'verification_3', label: 'Информация по безопасности', width: '180px' },
          { key: 'residual_risk_level', label: 'Тяжесть вреда, балл', width: '130px' },
          { key: 'residual_probability', label: 'Вероятность причинения вреда, балл', width: '150px' },
          { key: 'residual_risk_score', label: 'Достигнутый риск и его уровень', width: '180px' },
          { key: 'risk_level_2', label: 'Уровень риска (доп./не доп.)', width: '150px' },
          { key: 'risk_benefit_analysis', label: 'Анализ остаточный риск/польза', width: '200px' },
          { key: 'new_risks', label: 'Новые риски в результате принятия мер по управлению', width: '250px' }
        ];
      case 'sheet5':
        // 14931 - пустой лист
        return [
          { key: 'content', label: 'Содержание', width: '800px' }
        ];
      case 'sheet6':
        // Определения 62366 - пустой лист
        return [
          { key: 'content', label: 'Содержание', width: '800px' }
        ];
      case 'sheet7':
        // Заключения-Выводы - пустой лист
        return [
          { key: 'content', label: 'Содержание', width: '800px' }
        ];
      default:
        // Для пользовательских листов возвращаем одну колонку
        return [
          { key: 'content', label: 'Содержание', width: '800px' }
        ];
    }
  };

  const columns = getColumns(activeSheet);

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
      icon: '📄'
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
      setActiveSheet('sheet1');
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
        const cols = getColumns(activeSheet);

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
    setHasChanges(true);
  };

  const handleCellDoubleClick = (rowIndex, columnKey) => {
    // Все ячейки теперь редактируемые
    setEditingCell({ rowIndex, columnKey });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleSave = async () => {
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
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Ошибка при сохранении данных. Проверьте подключение к серверу.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewRow = () => {
    const cols = getColumns(activeSheet);
    const newRow = { number: data.length + 1, id: null, isNew: true };
    cols.forEach(col => {
      if (col.key !== 'number') {
        newRow[col.key] = '';
      }
    });
    setData([...data, newRow]);
    setHasChanges(true);
  };

  const handleAddNewColumn = () => {
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
  };

  const handleDeleteColumn = (columnKey) => {
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

  const renderCell = (row, column, rowIndex) => {
    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnKey === column.key;
    const value = row[column.key] || '';
    const cellColor = getCellColor(rowIndex, column.key);

    if (isEditing) {
      return (
        <input
          type="text"
          className="excel-cell-input"
          value={value}
          onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
          onBlur={handleCellBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{ 
            backgroundColor: cellColor,
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'normal'
          }}
        />
      );
    }

    return (
      <div 
        className="excel-cell-content"
        style={{ backgroundColor: cellColor }}
        onClick={(e) => {
          e.stopPropagation();
          // Одинарный клик для редактирования
          if (!isEditing) {
            handleCellDoubleClick(rowIndex, column.key);
          }
          // Также устанавливаем выбранную ячейку для палитры цветов
          setSelectedCell({ rowIndex, columnKey: column.key });
        }}
      >
        {value || ''}
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
          <div className="excel-toolbar-right">
            {/* Палитра цветов */}
            {selectedCell && (
              <div className="toolbar-color-picker">
                <span className="color-picker-label">Цвет ячейки:</span>
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
              {saving ? '💾 Сохранение...' : '💾 Сохранить'}
            </button>
            <button 
              className="excel-btn excel-btn-close" 
              onClick={onClose}
            >
              ✕ Закрыть
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
                  ✕
                </button>
              )}
            </div>
          ))}
          
          {/* Кнопка добавления нового листа */}
          <button 
            className="excel-tab add-sheet-btn" 
            onClick={handleAddNewSheet}
            title="Добавить новый лист"
          >
            <span className="tab-icon">➕</span>
          </button>
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
                    <button 
                      className="delete-column-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteColumn(column.key);
                        setShowDeleteColumn(null);
                      }}
                      title="Удалить столбец"
                    >
                      ✕
                    </button>
                    <div 
                      className="column-letter-resizer"
                      onMouseDown={(e) => handleColumnResizeStart(column.key, e)}
                    />
                  </th>
                ))}
                <th className="add-column-cell">
                  <button className="add-column-btn" onClick={handleAddNewColumn} title="Добавить столбец">
                    ➕
                  </button>
                </th>
              </tr>

              {/* Ряд с названиями столбцов */}
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
                      {row.number}
                      <button 
                        className="delete-row-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRow(rowIndex);
                          setShowDeleteRow(null);
                        }}
                        title="Удалить строку"
                      >
                        ✕
                      </button>
                    </div>
                    <div 
                      className="row-resizer"
                      onMouseDown={(e) => handleRowResizeStart(rowIndex, e)}
                    />
                  </td>
                  {columns.map(column => (
                    <td 
                      key={column.key} 
                      className="editable"
                      style={{ width: getColumnWidth(column.key), minWidth: '60px' }}
                    >
                      <div className="excel-cell-wrapper">
                        {renderCell(row, column, rowIndex)}
                      </div>
                    </td>
                  ))}
                  <td></td>
                </tr>
              ))}
              {/* Строка с кнопкой добавления */}
              <tr>
                <td className="add-row-cell">
                  <button className="add-row-btn-icon" onClick={handleAddNewRow} title="Добавить строку">
                    ➕
                  </button>
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
    </div>
  );
};

export default ExcelTable;
