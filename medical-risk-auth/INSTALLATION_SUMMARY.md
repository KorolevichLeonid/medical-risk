# Installation Summary - Document Generation Feature

## ✅ Что было реализовано

### Backend (Python/FastAPI)

1. **Модель данных** (`app/models/document.py`)
   - `DocumentVersion` - модель для хранения версий документов
   - Поля: версия, номер отчета, файл DOCX, снимок данных, статус

2. **Схемы API** (`app/schemas/document.py`)
   - `DocumentVersionCreate` - создание документа
   - `DocumentVersionResponse` - ответ с информацией о документе
   - `DocumentVersionList` - список версий
   - `GenerateDocumentRequest` - запрос на генерацию

3. **Сервис генерации** (`app/services/document_generator.py`)
   - `RiskManagementReportGenerator` - класс для генерации DOCX
   - Автоматическое заполнение 10 разделов + приложение
   - Использование данных из БД (projects, risk_table_rows, team members)
   - Форматирование таблиц, заголовков, списков

4. **API роутер** (`app/routers/documents.py`)
   - `POST /api/documents/projects/{id}/generate` - генерация новой версии
   - `GET /api/documents/projects/{id}/current` - получить текущую версию
   - `GET /api/documents/projects/{id}/versions` - история версий
   - `GET /api/documents/projects/{id}/versions/{version_id}` - информация о версии
   - `GET /api/documents/projects/{id}/versions/{version_id}/download` - скачать DOCX

5. **Регистрация в приложении** (`app/main.py`)
   - Добавлен импорт моделей и роутера документов
   - Создание таблицы `document_versions` в БД
   - Регистрация роутера документов

6. **Зависимости** (`requirements.txt`)
   - Добавлена `python-docx>=1.1.0`

### Frontend (React)

1. **Страница просмотра документов** (`pages/DocumentView.js`)
   - Просмотр информации о текущей версии
   - Отображение структуры документа
   - Кнопка генерации нового документа
   - Кнопка скачивания DOCX
   - Панель истории версий
   - Просмотр и скачивание старых версий

2. **Стили** (`pages/DocumentView.css`)
   - Современный дизайн с карточками
   - Адаптивная верстка
   - Анимации и переходы
   - Панель истории версий

3. **Интеграция** (`App.js`, `ProjectView.js`)
   - Добавлен маршрут `/project/:id/documents`
   - Кнопка "📄 View Document" на странице проекта
   - Навигация между страницами

### Документация

1. **Mapping данных** (`DOCUMENT_DATA_MAPPING.md`)
   - Подробное описание всех разделов документа
   - Маппинг полей БД в документ
   - Примеры JSON структур
   - Список недостающих полей (PLACEHOLDER)
   - Рекомендации по улучшению

2. **Руководство пользователя** (`DOCUMENT_GENERATION_GUIDE.md`)
   - Как генерировать документы
   - Как просматривать историю версий
   - Как скачивать документы
   - Описание структуры документа
   - Устранение проблем

---

## 📊 Структура базы данных

### Новая таблица: `document_versions`

```sql
CREATE TABLE document_versions (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL,
    version VARCHAR NOT NULL,
    report_number VARCHAR,
    title VARCHAR NOT NULL,
    document_type VARCHAR NOT NULL,
    file_data BLOB,
    file_name VARCHAR NOT NULL,
    file_size INTEGER,
    snapshot_data TEXT,
    generated_by INTEGER NOT NULL,
    generated_at TIMESTAMP,
    is_current BOOLEAN,
    created_at TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (generated_by) REFERENCES users(id)
);
```

---

## 🚀 Как запустить

### 1. Установка зависимостей

**Backend:**
```bash
cd medical-risk-auth/backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd medical-risk-auth/frontend
npm install
```

### 2. Запуск приложения

**Backend:**
```bash
cd medical-risk-auth/backend
python run.py
# Или: uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd medical-risk-auth/frontend
npm start
```

### 3. Использование

1. Войдите в систему
2. Откройте любой проект
3. Нажмите "📄 View Document"
4. Нажмите "🔄 Generate New Version"
5. Скачайте документ кнопкой "⬇️ Download Document (DOCX)"

---

## ⚠️ Важные замечания

### Поля-заглушки (PLACEHOLDER)

Некоторые разделы документа содержат PLACEHOLDER, так как данные еще не добавлены в БД:

**Требуют добавления в таблицу `projects`:**
- `manufacturer` - название производителя
- `manufacturer_address` - адрес производителя
- `patient_population` - популяция пациентов
- `key_performance_characteristics` - ключевые характеристики
- `safety_characteristics` - характеристики безопасности

**Требуют доработки логики:**
- Подписи команды (Prepared by, Reviewed by, Approved by)
- Рендеринг чек-листа опасностей
- Формула расчета общего риска
- Оценка соотношения польза/риск

**Эти поля можно заполнить вручную в Word после скачивания документа.**

### Данные для качественного документа

Убедитесь, что заполнены следующие поля в проекте:
- ✅ device_name
- ✅ device_model
- ✅ device_classification
- ✅ intended_use
- ✅ user_profile
- ✅ operating_environment
- ✅ standards
- ✅ lifecycle_stages (JSON array)
- ✅ active_hazard_categories (JSON array)

И в таблице рисков (risk_table_rows.data):
- ✅ lifecycle_stage
- ✅ hazard
- ✅ hazardous_situation
- ✅ sequence_of_events
- ✅ harm
- ✅ severity_initial (1-5)
- ✅ probability_initial (1-5)
- ✅ control_measures
- ✅ verification
- ✅ severity_residual (1-5)
- ✅ probability_residual (1-5)

---

## 📁 Новые файлы

### Backend:
```
medical-risk-auth/backend/
├── app/
│   ├── models/
│   │   └── document.py          # ✨ НОВАЯ модель DocumentVersion
│   ├── schemas/
│   │   └── document.py          # ✨ НОВЫЕ схемы API
│   ├── routers/
│   │   └── documents.py         # ✨ НОВЫЙ роутер документов
│   └── services/
│       └── document_generator.py # ✨ НОВЫЙ сервис генерации
├── DOCUMENT_DATA_MAPPING.md      # ✨ НОВАЯ документация маппинга
└── requirements.txt              # ИЗМЕНЕН (добавлен python-docx)
```

### Frontend:
```
medical-risk-auth/frontend/
└── src/
    ├── pages/
    │   ├── DocumentView.js       # ✨ НОВАЯ страница документов
    │   ├── DocumentView.css      # ✨ НОВЫЕ стили
    │   └── ProjectView.js        # ИЗМЕНЕН (добавлена кнопка)
    └── App.js                    # ИЗМЕНЕН (добавлен маршрут)
```

### Документация:
```
medical-risk-auth/
├── DOCUMENT_GENERATION_GUIDE.md  # ✨ НОВОЕ руководство пользователя
└── INSTALLATION_SUMMARY.md       # ✨ НОВАЯ сводка установки
```

---

## 🧪 Тестирование

### Тест генерации документа:

1. Создайте тестовый проект с данными
2. Добавьте несколько рисков в таблицу рисков
3. Перейдите на страницу документов
4. Нажмите "Generate New Version"
5. Проверьте, что версия создалась (v1.0)
6. Скачайте и откройте DOCX файл
7. Проверьте заполнение разделов

### Тест истории версий:

1. Сгенерируйте 2-3 версии документа
2. Откройте панель Version History
3. Выберите старую версию
4. Проверьте, что отображается корректная информация
5. Скачайте старую версию

---

## 🔧 API тестирование

### Через Swagger UI:
```
http://localhost:8000/docs
```

Найдите раздел "documents" и протестируйте endpoints.

### Через cURL:

**Генерация документа:**
```bash
curl -X POST "http://localhost:8000/api/documents/projects/1/generate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"auto_version": true}'
```

**Получить версии:**
```bash
curl -X GET "http://localhost:8000/api/documents/projects/1/versions" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Скачать документ:**
```bash
curl -X GET "http://localhost:8000/api/documents/projects/1/versions/1/download" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output report.docx
```

---

## 📈 Статистика

- **Новых файлов**: 9
- **Измененных файлов**: 4
- **Строк кода (backend)**: ~800
- **Строк кода (frontend)**: ~400
- **Документации**: ~1500 строк

---

## 🎯 Следующие шаги

### Рекомендуется реализовать:

1. **Приоритет 1:**
   - [ ] Добавить manufacturer и manufacturer_address в projects
   - [ ] Реализовать назначение ролей команды для подписей
   - [ ] Добавить рендеринг hazard_checklist_answers

2. **Приоритет 2:**
   - [ ] Добавить недостающие характеристики устройства
   - [ ] Реализовать формулу общего риска
   - [ ] Добавить job_title в users
   - [ ] Реализовать benefit-risk assessment

3. **Приоритет 3:**
   - [ ] Добавить экспорт в PDF
   - [ ] Сделать конфигурируемыми формулы рисков
   - [ ] Добавить многоязычность
   - [ ] Добавить кастомные шаблоны

---

## 📞 Контакты

Для вопросов и поддержки:
- См. `DOCUMENT_DATA_MAPPING.md` - технические детали
- См. `DOCUMENT_GENERATION_GUIDE.md` - руководство пользователя
- Проверьте `/docs` - Swagger документация API

---

**Статус**: ✅ Готово к использованию  
**Версия**: 1.0  
**Дата**: 7 ноября 2025

