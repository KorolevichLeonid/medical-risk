# Тестирование гибридной системы управления рисками

## 📋 Обзор изменений

Реализован **Вариант 4 (Гибридный подход)**:
- **Риски (RiskAnalysis)** - структурированные данные
- **Таблица управления рисками (ExcelTable)** - визуализация и оценка
- **Автоматическая синхронизация** в обе стороны

---

## 🔄 Как работает синхронизация

### 1. Риск → Таблица (автоматически)

```
Пользователь создает риск
  ↓
Заполняет: hazard_name, hazardous_situation, sequence_of_events, harm, hazard_category, lifecycle_stage
  ↓
НЕ заполняет: severity_score, probability_score, control_measures (теперь опциональны)
  ↓
Риск сохраняется в БД (таблица risk_factors)
  ↓
АВТОМАТИЧЕСКИ создается строка в соответствующем листе таблицы:
  - energy_functional → sheet1 (Энергетические опасности)
  - biological_chemical → sheet2 (Биохимические опасности)
  - operational_informational → sheet3 (Эксплуатационные опасности)
  - software → sheet4 (Программные опасности)
```

### 2. Таблица → Риск (при сохранении)

```
Пользователь открывает Risk Management Table
  ↓
Видит риски, автоматически загруженные из risk_factors
  ↓
Вводит severity_score и probability_score в ячейки
  ↓
Нажимает "Сохранить"
  ↓
Оценки сохраняются в таблицу (таблица risk_table_rows)
  ↓
АВТОМАТИЧЕСКИ обновляются в risk_factors
  ↓
risk_score пересчитывается автоматически (severity × probability)
```

---

## ✅ Тестовый сценарий

### Шаг 1: Создание риска

1. Откройте проект
2. Нажмите **"Manage Risk Analysis"**
3. Нажмите **"+ Add Risk"**
4. Заполните форму:
   - **Lifecycle Stage**: Operation
   - **Hazard Category**: Energy/Functional *(важно!)*
   - **Hazard Name**: Электрический шок
   - **Hazardous Situation**: Пользователь касается оголенных проводов
   - **Sequence of Events**: Повреждение изоляции → контакт с током
   - **Harm**: Ожоги, остановка сердца

5. **Обратите внимание**: 
   - ❌ Нет полей Severity Score
   - ❌ Нет полей Probability Score
   - ❌ Нет полей Control Measures
   - ℹ️ Есть подсказка: "Risk scores and control measures will be filled in the Risk Management Table"

6. Нажмите **"Add Risk"**

**Ожидаемый результат:**
- ✅ Риск создан
- ✅ В таблице рисков показывается "Not evaluated" вместо оценки
- ✅ Риск автоматически добавлен в Risk Management Table

---

### Шаг 2: Проверка синхронизации с таблицей

1. Вернитесь на страницу проекта
2. Нажмите **"📊 Risk Management Table"**
3. Откроется Excel-таблица
4. Перейдите на вкладку **"Энергетические опасности"** (sheet1)

**Ожидаемый результат:**
- ✅ Вы видите новую строку с вашим риском
- ✅ Заполнены колонки:
  - Risk ID: [число]
  - Lifecycle Stage: operation
  - Hazard Name: Электрический шок
  - Event Sequence: Повреждение изоляции → контакт с током
  - Hazardous Situation: Пользователь касается оголенных проводов
  - Harm: Ожоги, остановка сердца
- ⚠️ Пустые колонки:
  - Severity Score: (пусто)
  - Probability Score: (пусто)
  - Risk Score: (пусто)

---

### Шаг 3: Оценка риска в таблице

1. В той же таблице найдите вашу строку
2. Нажмите на ячейку **"Severity Score"**
3. Введите значение: **4**
4. Нажмите на ячейку **"Probability Score"**
5. Введите значение: **3**
6. **Обратите внимание**: Risk Score должен автоматически рассчитаться как **12**
7. Нажмите **"Сохранить"** в верхнем правом углу

**Ожидаемый результат:**
- ✅ Сообщение "Данные успешно сохранены на сервере!"
- ✅ Risk Score = 12 (4 × 3)
- ✅ Оценки сохранены в БД

---

### Шаг 4: Проверка обратной синхронизации

1. Закройте Risk Management Table
2. Вернитесь в **"Manage Risk Analysis"**
3. Найдите риск "Электрический шок"
4. Нажмите **"View"**

**Ожидаемый результат:**
- ✅ Отображаются основные данные риска
- ✅ Показываются оценки из таблицы:
  - **Severity Score (from Risk Table): 4**
  - **Probability Score (from Risk Table): 3**
  - **Risk Score (from Risk Table): 12**
- ✅ Внизу кнопка **"📊 Open in Risk Table"**

---

### Шаг 5: Переход к риску из формы

1. В окне просмотра риска нажмите **"📊 Open in Risk Table"**

**Ожидаемый результат:**
- ✅ Открывается Risk Management Table
- ✅ Автоматически выбран лист "Энергетические опасности" (sheet1)
- ✅ Строка с риском видна в таблице

---

## 🔍 Проверка в базе данных

### Таблица risk_factors

```sql
SELECT 
  id,
  hazard_name,
  severity_score,
  probability_score,
  risk_score
FROM risk_factors
WHERE hazard_name = 'Электрический шок';
```

**Ожидаемый результат:**
```
id | hazard_name        | severity_score | probability_score | risk_score
---|--------------------|----------------|-------------------|------------
1  | Электрический шок  | 4              | 3                 | 12
```

### Таблица risk_table_rows

```sql
SELECT 
  id,
  table_id,
  row_number,
  data
FROM risk_table_rows
WHERE data->>'hazard_name' = 'Электрический шок';
```

**Ожидаемый результат:**
```json
{
  "risk_id": "1",
  "lifecycle_stage": "operation",
  "hazard_name": "Электрический шок",
  "severity_score": "4",
  "probability_score": "3",
  "risk_score": "12",
  ...
}
```

---

## 🎯 Тест разных категорий

### Biological/Chemical → sheet2

1. Создайте риск с **Hazard Category**: Biological/Chemical
2. Проверьте, что он попал в лист **"Биохимические опасности"** (sheet2)

### Operational/Informational → sheet3

1. Создайте риск с **Hazard Category**: Operational/Informational
2. Проверьте, что он попал в лист **"Эксплуатационные и информ"** (sheet3)

### Software → sheet4

1. Создайте риск с **Hazard Category**: Software
2. Проверьте, что он попал в лист **"Программные"** (sheet4)

---

## ⚠️ Проверка ограничений

### Тест удаления

1. Удалите риск из **Manage Risk Analysis**
2. Откройте Risk Management Table
3. **Ожидается**: Строка с этим риском исчезла из таблицы

### Тест редактирования

1. Отредактируйте базовые данные риска (hazard_name, harm и т.д.)
2. Откройте Risk Management Table
3. **Ожидается**: Данные обновились в таблице

### Тест листов 5-7

1. Откройте листы "14931", "Определения 62366", "Заключения-Выводы"
2. **Ожидается**: Эти листы пустые и доступны для свободного редактирования
3. Добавьте произвольный текст и сохраните
4. **Ожидается**: Данные сохраняются как обычная Excel-таблица

---

## 🐛 Известные проблемы для исправления

1. [ ] ExcelTable не открывается автоматически на нужном листе при переходе из риска
2. [ ] Нужно добавить блокировку редактирования базовых полей в AUTO листах
3. [ ] Подсветка строки риска при переходе из формы
4. [ ] Валидация: severity_score и probability_score должны быть 0-10

---

## 📝 API Endpoints

### Синхронизация всех рисков проекта

```
POST /api/risk-tables/project/{project_id}/sync-risks
```

**Использование:**
```bash
curl -X POST http://localhost:8000/api/risk-tables/project/1/sync-risks
```

**Ответ:**
```json
{
  "message": "Risks synchronized successfully",
  "synced_count": 5
}
```

---

## 🚀 Следующие шаги

1. ✅ Backend синхронизация реализована
2. ✅ Frontend формы обновлены
3. ✅ Кнопка "Open in Risk Table" добавлена
4. ⏳ Доработать ExcelTable для авто-открытия нужного листа
5. ⏳ Добавить визуальную блокировку AUTO полей
6. ⏳ Тестирование и исправление багов

