# 🏥 Medical Risk Management System

## 📋 Описание проекта

**Medical Risk Management System** — это веб-приложение для управления анализом рисков медицинских устройств. Система предназначена для медицинских организаций, которые разрабатывают, производят или используют медицинские устройства и должны соответствовать стандартам качества и безопасности.

### 🎯 Основные возможности
- ✅ Создание и управление проектами анализа рисков
- ✅ Идентификация и оценка потенциальных рисков медицинских устройств
- ✅ Система ролей и разрешений (SYS_ADMIN, USER + проектные роли)
- ✅ Интеграция с Azure Active Directory
- ✅ Комплексное логирование всех операций
- ✅ Dashboard с аналитикой и отчетами

---

## 🏗️ Архитектура

```
Frontend (React.js) ←→ Backend (FastAPI) ←→ Database (SQLite)
     ↓                       ↓                     ↓
  Port 3000              Port 8000          medical_risk.db
     ↓                       ↓
 Azure AD Auth         JWT + Sessions
```

### Технологический стек

**Backend:**
- **Python 3.8+** с **FastAPI**
- **SQLAlchemy** (ORM) + **Alembic** (миграции)
- **Pydantic** (валидация данных)
- **JWT** + **Azure AD** аутентификация

**Frontend:**
- **React.js 18** + **React Router**
- **Material-UI** компоненты
- **Axios** для HTTP запросов
- **TypeScript** (частично)

**База данных:**
- **SQLite** (разработка)
- Готовность к миграции на **PostgreSQL**

---

## 🚀 Быстрый старт

### Предварительные требования
- Python 3.8+ ([Скачать](https://www.python.org/))
- Node.js 16+ ([Скачать](https://nodejs.org/))
- Git

### 1. Клонирование и настройка

```bash
# Клонирование репозитория
git clone <repository-url>
cd medical-risk
```

### 2. Запуск Backend (Python/FastAPI)

```bash
# Переход в backend папку
cd backend

# Создание виртуального окружения
python -m venv venv

# Активация виртуального окружения
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Инициализация базы данных
python init_db.py

# Запуск сервера
python run.py
```
**✅ Backend запущен на**: http://localhost:8000

### 3. Запуск Frontend (React.js)

```bash
# Переход в frontend папку (в новом терминале)
cd frontend

# Установка зависимостей
npm install

# Запуск приложения
npm start
```
**✅ Frontend запущен на**: http://localhost:3000

### 4. Первый вход
1. Откройте http://localhost:3000
2. Используйте Azure AD вход или создайте локальную учетную запись
3. Создайте первый проект и начните работу!

---

## 📁 Структура проекта

```
medical-risk/ (130 файлов, ~9,500 строк кода)
├── 📁 backend/                     # Python/FastAPI сервер
│   ├── 📁 app/
│   │   ├── 📁 core/               # Аутентификация, конфигурация, логирование
│   │   ├── 📁 models/             # SQLAlchemy модели БД
│   │   ├── 📁 routers/            # API эндпоинты
│   │   ├── 📁 schemas/            # Pydantic схемы валидации
│   │   ├── database.py            # Подключение к БД
│   │   └── main.py                # Точка входа FastAPI
│   ├── requirements.txt
│   ├── run.py
│   └── init_db.py
│
├── 📁 frontend/                   # React.js приложение  
│   ├── 📁 src/
│   │   ├── 📁 components/         # React компоненты
│   │   ├── 📁 pages/              # Страницы приложения
│   │   ├── App.js                 # Главный компонент
│   │   └── authConfig.js          # Конфигурация Azure AD
│   ├── package.json
│   └── package-lock.json
│
├── medical_risk.db               # SQLite база данных
└── README.md                     # Этот файл
```

---

## 🎭 Система ролей

### Глобальные роли (закрепляются за пользователем)
- **SYS_ADMIN** - полный доступ ко всем проектам и системным функциям
- **USER** - доступ только к своим проектам

### Проектные роли (назначаются в конкретном проекте)
- **ADMIN** - полное управление проектом, участниками и рисками
- **MANAGER** - управление участниками, просмотр данных проекта  
- **DOCTOR** - редактирование рисков, просмотр данных

### Доступ к логам (Changelog)
- **SYS_ADMIN**: видит логи всех проектов в системе
- **USER**: видит логи только тех проектов, где имеет роль ADMIN

---

## 🔌 API документация

После запуска backend сервера доступна автоматическая документация:
- **Swagger UI**: http://localhost:8000/docs  
- **ReDoc**: http://localhost:8000/redoc

### Основные эндпоинты:
```http
# Аутентификация
POST /api/auth/azure-login      # Вход через Azure AD
POST /api/auth/login            # Локальный вход
GET  /api/auth/me               # Текущий пользователь

# Проекты  
GET    /api/projects/           # Список проектов
POST   /api/projects/           # Создание проекта
GET    /api/projects/{id}       # Детали проекта
PUT    /api/projects/{id}       # Обновление проекта

# Риски
GET    /api/risk-analyses/project/{project_id}  # Анализы проекта
POST   /api/risk-analyses/                      # Создание анализа
POST   /api/risk-analyses/{id}/risk-factors     # Добавление риска

# Логи
GET /api/changelog/projects              # Логи всех проектов  
GET /api/changelog/project/{project_id}  # Логи проекта
```

---

## 🗄️ База данных

### Основные таблицы:
- **users** - пользователи системы
- **projects** - проекты анализа рисков  
- **project_members** - участники проектов с ролями
- **risk_analyses** - анализы рисков
- **risk_factors** - факторы риска с оценками
- **changelogs** - история всех изменений в системе

### Управление БД:
```bash
# Пересоздание БД (если нужно)
python init_db.py

# Создание администратора
python create_admin.py
```

---

## 🔧 Разработка

### Backend разработка:
```bash
cd backend
# Запуск с автоперезагрузкой
python run.py
# или
uvicorn app.main:app --reload
```

### Frontend разработка:
```bash  
cd frontend
# Запуск dev сервера
npm start
# Сборка для production
npm run build
```

### Отладка:
- **Backend логи**: видны в консоли при запуске
- **Frontend**: используйте Developer Tools браузера
- **API тестирование**: http://localhost:8000/docs

---

## 🔧 Troubleshooting

### Частые проблемы:

**Backend не запускается:**
```bash
# Проверьте Python версию  
python --version  # Должна быть 3.8+

# Переустановите зависимости
pip install -r requirements.txt --force-reinstall
```

**Frontend не компилируется:**
```bash
# Очистите кэш
rm -rf node_modules package-lock.json
npm install
```

**CORS ошибки:**
- Убедитесь, что backend запущен на порту 8000
- Frontend должен быть на порту 3000
- Проверьте настройки CORS в `backend/app/main.py`

**База данных:**
```bash
# Если проблемы с БД - пересоздайте её
rm medical_risk.db
python init_db.py
```

---

## 📊 Статистика проекта

- **Общее количество файлов**: 130
- **Объем кода**: ~9,500 строк
  - Python (Backend): ~3,500 строк
  - JavaScript/React: ~4,200 строк
  - CSS: ~1,800 строк

---

## 📞 Контакты

**Репозиторий**: [Ссылка на Git репозиторий]  
**Issue Tracker**: [Ссылка на Issues]  
**Документация**: http://localhost:8000/docs (после запуска)

---

## 📄 Статус проекта

✅ **Активная разработка** - Все основные функции реализованы и работают  
🔄 **Готов к использованию** - Стабильная версия для внутреннего использования

---

*Версия: 1.0 | Обновлено: 2024*