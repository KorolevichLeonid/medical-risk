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
- `DATABASE_URL` - автоматически из базы данных
- `FRONTEND_URL` - автоматически из frontend сервиса
- `REACT_APP_API_BASE_URL` - автоматически из backend сервиса
- `SECRET_KEY` - автоматически генерируется
- `CORS_ORIGINS` - автоматически из frontend URL

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
2. **Workers**: Backend запускается с 2 workers для лучшей производительности
3. **CORS**: Автоматически настраивается для frontend URL
4. **Переменные окружения**: Все настраиваются автоматически через render.yaml

## Troubleshooting:

Если что-то не работает:
1. Проверьте логи в Render Dashboard
2. Убедитесь, что все сервисы запущены
3. Проверьте, что база данных создана и подключена
4. Проверьте переменные окружения в настройках сервисов
