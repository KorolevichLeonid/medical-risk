# Инструкция по деплою на Render

## Подготовка к деплою

Проект уже настроен для деплоя на Render через файл `render.yaml`.

## Что нужно сделать перед деплоем:

### 1. Убедитесь, что все изменения закоммичены и запушены:
```bash
git add .
git commit -m "Подготовка к деплою на Render"
git push origin render
```

### 2. Настройка на Render:

1. Перейдите на https://render.com
2. Подключите ваш GitHub репозиторий
3. Render автоматически обнаружит `render.yaml` и создаст все необходимые сервисы:
   - **medical-risk-db** - PostgreSQL база данных
   - **medical-risk-backend** - Backend API (Python/FastAPI)
   - **medical-risk-frontend** - Frontend (React static site)

### 3. Переменные окружения:

Все необходимые переменные окружения настроены в `render.yaml`:
- Backend:
  - `DATABASE_URL` - автоматически из базы данных
  - `FRONTEND_URL` - автоматически из frontend сервиса
  - `CORS_ORIGINS` - автоматически из frontend URL
  - `SECRET_KEY` - автоматически генерируется
  - `PYTHON_VERSION`, `PYTHONUNBUFFERED`
- Frontend:
  - `REACT_APP_API_BASE_URL` - автоматически из backend сервиса
  - `REACT_APP_REDIRECT_URI` - автоматически из frontend URL
  - `REACT_APP_POST_LOGOUT_REDIRECT_URI` - автоматически из frontend URL
  - `NODE_VERSION`

### 4. Первый запуск:

После деплоя:
1. Backend автоматически инициализирует базу данных
2. Создастся структура таблиц
3. Инициализируются permissions и роли
4. Создастся администратор (если нужно)

### 5. Проверка работы:

- Backend API: `https://medical-risk-backend.onrender.com`
- Frontend: `https://medical-risk-frontend.onrender.com`
- API Docs: `https://medical-risk-backend.onrender.com/docs`

## Структура проекта:

```
medical-risk/
├── render.yaml                    # Конфигурация Render
├── medical-risk-auth/
│   ├── backend/
│   │   ├── start.sh              # Скрипт запуска для продакшена
│   │   ├── requirements.txt      # Python зависимости
│   │   └── app/                  # Backend код
│   └── frontend/
│       ├── package.json          # Node зависимости
│       └── src/                  # Frontend код
```

## Важные замечания:

1. **База данных**: Используется PostgreSQL на Render (free tier)
2. **Health check**: Backend проверяется через `/health`
3. **CORS**: Автоматически настраивается для frontend URL
4. **SPA маршруты**: Для React настроен rewrite `/* -> /index.html`
5. **Переменные окружения**: Все ключевые переменные настраиваются через `render.yaml`

## Troubleshooting:

Если что-то не работает:
1. Проверьте логи в Render Dashboard
2. Убедитесь, что все сервисы запущены
3. Проверьте, что база данных создана и подключена
4. Проверьте переменные окружения в настройках сервисов

## Обновления БД и совместимость

- Для роли `specialist` поддерживается назначение нескольких этапов ЖЦ.
- Поле `project_members.assigned_lifecycle_stage` теперь используется как:
  - одно значение (legacy),
  - или JSON-массив строк (новый формат).
- При запуске backend через `start.sh` выполняется `python -m app.init_db`, который:
  - добавляет `assigned_lifecycle_stage`, если его нет;
  - на PostgreSQL автоматически переводит тип колонки в `TEXT` (с `VARCHAR(255)`), чтобы корректно хранить JSON-массивы.

## Pre-push checklist

Перед `git push` рекомендуется выполнить:

```bash
# backend
cd medical-risk-auth/backend
python -m py_compile app/init_db.py app/models/project.py app/routers/projects.py app/routers/risk_analyses.py app/routers/risk_tables.py app/routers/permissions.py app/schemas/project.py

# frontend
cd ../frontend
npm run build
```

Если используете локальную SQLite-базу для dev-окружения, включите изменения в `medical-risk-auth/medical_risk.db` в коммит.
