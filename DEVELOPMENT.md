# 👨‍💻 Техническая документация для разработчиков

## 📋 Содержание
- [Детальная архитектура](#детальная-архитектура)
- [Конфигурация окружения](#конфигурация-окружения)
- [Подробная структура API](#подробная-структура-api)
- [Схема базы данных](#схема-базы-данных)
- [Система логирования](#система-логирования)
- [Тестирование](#тестирование)
- [Deployment](#deployment)

---

## 🏗️ Детальная архитектура

### Backend компоненты

```python
app/
├── core/
│   ├── auth.py           # JWT, авторизация, middleware
│   ├── azure_auth.py     # Azure AD интеграция
│   ├── config.py         # Настройки из env переменных
│   ├── logging.py        # Бизнес-логика логирования
│   ├── logging_helper.py # Низкоуровневые функции логирования
│   └── security.py       # Хеширование паролей, безопасность
├── models/
│   ├── user.py          # User, UserRole enum
│   ├── project.py       # Project, ProjectMember, ProjectRole, ProjectStatus
│   ├── risk_analysis.py # RiskAnalysis, RiskFactor
│   └── changelog.py     # ChangeLog, ActionType enum
├── routers/
│   ├── auth.py          # /api/auth/* endpoints
│   ├── users.py         # /api/users/* endpoints  
│   ├── projects.py      # /api/projects/* endpoints
│   ├── risk_analyses.py # /api/risk-analyses/* endpoints
│   └── changelog.py     # /api/changelog/* endpoints
└── schemas/
    ├── user.py          # Pydantic модели для User API
    ├── project.py       # Pydantic модели для Project API
    ├── risk_analysis.py # Pydantic модели для RiskAnalysis API
    └── changelog.py     # Pydantic модели для ChangeLog API
```

### Frontend компоненты

```javascript
src/
├── components/
│   ├── Layout.js          # Общий макет с навигацией
│   └── ProtectedRoute.js  # HOC для проверки аутентификации
├── pages/
│   ├── AuthPage.js        # Страница входа/регистрации
│   ├── Dashboard.js       # Главная с статистикой
│   ├── ProjectForm.js     # Создание/редактирование проекта
│   ├── ProjectView.js     # Детальный просмотр проекта
│   ├── RiskAnalysis.js    # Управление рисками
│   ├── Changelog.js       # Список логов по проектам
│   ├── ChangelogDetail.js # Детали конкретного изменения
│   ├── ChangelogHistory.js# История изменений проекта
│   ├── RoleManagement.js  # Управление ролями пользователей
│   └── PersonalAccount.js # Личный кабинет
├── api/                   # HTTP клиенты для каждого API
├── authConfig.js          # Конфигурация MSAL для Azure AD
└── App.js                 # Главный компонент с роутингом
```

---

## ⚙️ Конфигурация окружения

### Backend (.env файл)

```bash
# Основные настройки
SECRET_KEY=your-super-secret-key-here
DEBUG=True
LOG_LEVEL=INFO

# База данных  
DATABASE_URL=sqlite:///./medical_risk.db
# Для PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost/medical_risk

# Azure AD настройки
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret  
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_REDIRECT_URI=http://localhost:3000

# JWT настройки
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
ALLOWED_ORIGINS=["http://localhost:3000","https://yourdomain.com"]

# Логирование
LOG_FILE_PATH=logs/app.log
LOG_ROTATION=midnight
LOG_RETENTION=30
```

### Frontend (authConfig.js)

```javascript
export const msalConfig = {
    auth: {
        clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
        redirectUri: process.env.REACT_APP_REDIRECT_URI || "http://localhost:3000"
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false
    }
};

export const loginRequest = {
    scopes: ["User.Read", "profile", "email", "openid"]
};

// API базовый URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
```

---

## 🔌 Подробная структура API

### Аутентификация (/api/auth)

```python
@router.post("/azure-login")
async def azure_login(
    request: AzureLoginRequest,
    db: Session = Depends(get_db)
) -> LoginResponse:
    """
    Аутентификация через Azure AD
    
    Процесс:
    1. Валидация Azure JWT токена
    2. Извлечение информации о пользователе
    3. Создание/обновление пользователя в БД
    4. Генерация локального JWT токена
    5. Логирование входа
    """

@router.post("/login") 
async def login(
    user_credentials: UserLogin,
    db: Session = Depends(get_db)
) -> LoginResponse:
    """Локальная аутентификация (fallback)"""

@router.get("/me")
async def get_current_user(
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """Получение информации о текущем пользователе"""
```

### Проекты (/api/projects)

```python
@router.post("/")
async def create_project(
    project: ProjectCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProjectResponse:
    """
    Создание проекта
    
    Автоматические действия:
    1. Создание записи в БД
    2. Назначение создателя как владельца
    3. Логирование создания
    """

@router.post("/{project_id}/members")
async def add_project_member(
    project_id: int,
    member_request: ProjectMemberAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProjectMemberResponse:
    """
    Добавление участника в проект
    
    Права доступа:
    - Только владелец или SYS_ADMIN может добавлять участников
    - Участнику назначается роль: ADMIN, MANAGER, или DOCTOR
    """
```

### Управление рисками (/api/risk-analyses)

```python
@router.post("/{analysis_id}/risk-factors")
async def add_risk_factor(
    analysis_id: int,
    risk_factor: RiskFactorCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> RiskFactorResponse:
    """
    Добавление фактора риска
    
    Автоматические вычисления:
    - risk_rating = probability_rating * severity_rating
    - Классификация: Low (1-6), Medium (8-12), High (15-25)
    - Логирование добавления
    """
```

### История изменений (/api/changelog)

```python
@router.get("/projects")
async def get_projects_changelog(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[ProjectChangeLogResponse]:
    """
    Получение логов проектов с учетом ролей
    
    Логика доступа:
    - SYS_ADMIN: все проекты
    - USER: только проекты где пользователь является админом
    """

@router.get("/{changelog_id}")
async def get_changelog_detail(
    changelog_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ChangeLogDetailResponse:
    """
    Детальная информация об изменении
    
    Включает:
    - Полную информацию о пользователе, выполнившем действие
    - До/после значения (old_values/new_values)
    - Метаданные (IP, User-Agent, время)
    """
```

---

## 🗄️ Схема базы данных

### Полная SQL схема

```sql
-- Перечисления
CREATE TYPE user_role AS ENUM ('SYS_ADMIN', 'USER');
CREATE TYPE project_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');
CREATE TYPE project_role AS ENUM ('ADMIN', 'MANAGER', 'DOCTOR');
CREATE TYPE action_type AS ENUM (
    'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED',
    'PROJECT_MEMBER_ADDED', 'PROJECT_MEMBER_REMOVED',
    'RISK_ANALYSIS_CREATED', 'RISK_CREATED', 'RISK_UPDATED', 'RISK_DELETED',
    'USER_LOGIN', 'USER_LOGOUT'
);

-- Пользователи
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    azure_id VARCHAR(255) UNIQUE,           -- Azure Object ID
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role DEFAULT 'USER',
    is_active BOOLEAN DEFAULT TRUE,
    hashed_password VARCHAR(255),            -- Для локальной аутентификации
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Проекты
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    device_name VARCHAR(255) NOT NULL,      -- Название медицинского устройства
    status project_status DEFAULT 'DRAFT',
    progress_percentage DECIMAL(5,2) DEFAULT 0.0,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Участники проектов (многие ко многим с ролями)
CREATE TABLE project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role project_role NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(project_id, user_id)  -- Один пользователь - одна роль в проекте
);

-- Анализы рисков
CREATE TABLE risk_analyses (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    has_body_contact BOOLEAN DEFAULT FALSE,
    energy_source_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(project_id)  -- Один анализ на проект
);

-- Факторы риска
CREATE TABLE risk_factors (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER NOT NULL REFERENCES risk_analyses(id) ON DELETE CASCADE,
    hazard_name VARCHAR(255) NOT NULL,
    hazard_description TEXT,
    probability_rating INTEGER CHECK(probability_rating BETWEEN 1 AND 5),
    severity_rating INTEGER CHECK(severity_rating BETWEEN 1 AND 5),
    risk_rating INTEGER,  -- Вычисляемое поле
    risk_control_measures TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Логи изменений
CREATE TABLE changelogs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,  -- Может быть системное событие
    action_type action_type NOT NULL,
    action_description TEXT NOT NULL,
    target_type VARCHAR(50),              -- 'project', 'user', 'risk', etc.
    target_id INTEGER,                    -- ID целевого объекта
    target_name VARCHAR(255),             -- Название для удобства
    old_values JSONB,                     -- Значения до изменения
    new_values JSONB,                     -- Значения после изменения
    extra_data JSONB,                     -- Дополнительные данные
    ip_address INET,                      -- IP адрес пользователя
    user_agent TEXT,                      -- User-Agent браузера
    created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX idx_users_azure_id ON users(azure_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_risk_factors_analysis ON risk_factors(analysis_id);
CREATE INDEX idx_changelogs_project ON changelogs(project_id);
CREATE INDEX idx_changelogs_user ON changelogs(user_id);
CREATE INDEX idx_changelogs_created_at ON changelogs(created_at);
```

---

## 📝 Система логирования

### Типы событий

```python
class ActionType(str, Enum):
    # Проекты
    PROJECT_CREATED = "PROJECT_CREATED"
    PROJECT_UPDATED = "PROJECT_UPDATED"
    PROJECT_DELETED = "PROJECT_DELETED"
    PROJECT_STATUS_CHANGED = "PROJECT_STATUS_CHANGED"
    
    # Участники проектов
    PROJECT_MEMBER_ADDED = "PROJECT_MEMBER_ADDED"
    PROJECT_MEMBER_REMOVED = "PROJECT_MEMBER_REMOVED"
    
    # Анализы рисков
    RISK_ANALYSIS_CREATED = "RISK_ANALYSIS_CREATED"
    RISK_CREATED = "RISK_CREATED"
    RISK_UPDATED = "RISK_UPDATED"
    RISK_DELETED = "RISK_DELETED"
    
    # Аутентификация
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"
```

### Примеры использования

```python
# Логирование создания проекта
await log_project_created(
    db=db,
    user=current_user,
    project_id=new_project.id,
    project_name=new_project.name,
    project_data={
        "name": new_project.name,
        "description": new_project.description,
        "device_name": new_project.device_name,
        "status": new_project.status.value
    },
    request=request
)

# Логирование обновления риска
await log_risk_updated(
    db=db,
    user=current_user,
    project_id=risk_factor.analysis.project_id,
    project_name=risk_factor.analysis.project.name,
    risk_id=risk_factor.id,
    risk_description=risk_factor.hazard_name,
    old_data={
        "hazard_name": old_values.get("hazard_name"),
        "probability_rating": old_values.get("probability_rating"),
        "severity_rating": old_values.get("severity_rating")
    },
    new_data={
        "hazard_name": risk_factor.hazard_name,
        "probability_rating": risk_factor.probability_rating,
        "severity_rating": risk_factor.severity_rating
    },
    request=request
)
```

---

## 🧪 Тестирование

### Backend тесты

```python
# tests/test_auth.py
def test_azure_login():
    """Тест Azure AD аутентификации"""
    
def test_jwt_token_generation():
    """Тест генерации JWT токенов"""

# tests/test_projects.py  
def test_create_project():
    """Тест создания проекта"""
    
def test_project_permissions():
    """Тест проверки прав доступа к проектам"""

# tests/test_risks.py
def test_risk_rating_calculation():
    """Тест автоматического расчета рейтинга риска"""

# Запуск тестов
pytest tests/ -v
pytest tests/ --coverage
```

### Frontend тесты

```javascript
// src/components/__tests__/Layout.test.js
describe('Layout Component', () => {
  test('renders navigation correctly', () => {
    // Тест навигации
  });
});

// src/pages/__tests__/Dashboard.test.js  
describe('Dashboard Page', () => {
  test('displays user statistics', () => {
    // Тест отображения статистики
  });
});

// Запуск тестов
npm test
npm run test:coverage
```

---

## 🚀 Deployment

### Docker настройка

```dockerfile
# Dockerfile.backend
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# Dockerfile.frontend  
FROM node:16-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/medical_risk
      - SECRET_KEY=${SECRET_KEY}
      - AZURE_CLIENT_ID=${AZURE_CLIENT_ID}
    depends_on:
      - db
    volumes:
      - ./backend:/app
      
  frontend:
    build:
      context: ./frontend  
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
      - REACT_APP_AZURE_CLIENT_ID=${AZURE_CLIENT_ID}
      
  db:
    image: postgres:13
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=medical_risk
    ports:
      - "5432:5432"  
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Production готовность

```bash
# Создание production образов
docker-compose -f docker-compose.prod.yml build

# Запуск в production режиме
docker-compose -f docker-compose.prod.yml up -d

# Мониторинг логов
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

**Обновлено**: 2024  
**Статус**: Готово к разработке и deployment
