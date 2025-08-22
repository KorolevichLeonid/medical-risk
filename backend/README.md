# Medical Risk Analysis API

Backend API для системы анализа рисков медицинских изделий.

## 🚀 Быстрый старт

### Требования
- Python 3.8+
- PostgreSQL 12+

### Установка

1. **Создайте виртуальную среду:**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

2. **Установите зависимости:**
```bash
pip install -r requirements.txt
```

3. **Настройте базу данных:**
```bash
# Скопируйте файл конфигурации (опционально)
cp env.example .env

# По умолчанию используется SQLite (medical_risk.db)
# Для PostgreSQL отредактируйте .env файл
```

4. **Запустите приложение:**
```bash
python run.py
```

API будет доступно по адресу: http://localhost:8000

## 📚 Документация API

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🔐 Тестовые пользователи

После инициализации создаются следующие пользователи:

| Email | Пароль | Роль |
|-------|--------|------|
| admin@example.com | admin123 | Администратор |
| doctor@example.com | doctor123 | Доктор |
| manager@example.com | manager123 | Менеджер |

## 🏗️ Архитектура

### Основные компоненты:
- **FastAPI** - веб-фреймворк
- **SQLAlchemy** - ORM для работы с БД
- **PostgreSQL** - база данных
- **JWT** - аутентификация
- **Pydantic** - валидация данных

### Структура проекта:
```
backend/
├── app/
│   ├── core/           # Конфигурация и безопасность
│   ├── models/         # Модели данных
│   ├── schemas/        # Pydantic схемы
│   ├── routers/        # API роутеры
│   ├── database.py     # Подключение к БД
│   └── main.py         # Главный файл приложения
├── requirements.txt    # Зависимости
└── run.py             # Скрипт запуска
```

## 🎯 Основные API endpoints

### Аутентификация
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/me` - Информация о текущем пользователе
- `POST /api/auth/logout` - Выход из системы

### Пользователи
- `GET /api/users/` - Список пользователей
- `POST /api/users/` - Создание пользователя
- `GET /api/users/{id}` - Информация о пользователе
- `PUT /api/users/{id}` - Обновление пользователя

### Проекты
- `GET /api/projects/` - Список проектов
- `POST /api/projects/` - Создание проекта
- `GET /api/projects/{id}` - Информация о проекте
- `PUT /api/projects/{id}` - Обновление проекта
- `POST /api/projects/{id}/members` - Добавление участника

### Анализ рисков
- `GET /api/risk-analysis/project/{id}` - Анализ рисков проекта
- `POST /api/risk-analysis/project/{id}` - Создание анализа рисков
- `POST /api/risk-analysis/{id}/factors` - Добавление фактора риска
- `PUT /api/risk-analysis/factors/{id}` - Обновление фактора риска

## 🔒 Система ролей

### Администратор (Admin)
- Полный доступ ко всем функциям
- Управление пользователями
- Просмотр всех проектов

### Доктор (Doctor)
- Создание и редактирование проектов
- Проведение анализа рисков
- Работа с назначенными проектами

### Менеджер (Manager)
- Управление проектами
- Назначение участников
- Мониторинг прогресса

## 🗃️ Модель данных

### Основные сущности:
- **User** - пользователи системы
- **Project** - проекты анализа рисков
- **RiskAnalysis** - анализ рисков
- **RiskFactor** - факторы риска
- **ProjectMember** - участники проекта
- **ProjectVersion** - версии проекта

## 🛠️ Разработка

### Запуск в режиме разработки:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Проверка здоровья API:
```bash
curl http://localhost:8000/health
```

## 📝 Логирование

Приложение использует стандартное логирование Python. Уровень логирования можно настроить через переменную окружения `LOG_LEVEL`.

## 🧪 Тестирование

Для запуска тестов (когда будут добавлены):
```bash
pytest
```
