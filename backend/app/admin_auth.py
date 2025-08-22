"""
Standalone admin authentication system
"""
from fastapi import APIRouter, Request, Form, HTTPException, Cookie, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional
import secrets
import hashlib
from datetime import datetime, timedelta

from .database import get_db
from .models.user import User, UserRole
from .models.project import Project
from .models.risk_analysis import RiskAnalysis

router = APIRouter()

# Простая система сессий для админки
admin_sessions = {}

# Админ учетные данные (в продакшене должны быть в переменных окружения)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

def create_admin_session(username: str) -> str:
    """Создать сессию для админа"""
    session_token = secrets.token_urlsafe(32)
    admin_sessions[session_token] = {
        "username": username,
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(hours=24)
    }
    return session_token

def verify_admin_session(session_token: Optional[str]) -> bool:
    """Проверить валидность сессии админа"""
    if not session_token or session_token not in admin_sessions:
        return False
    
    session = admin_sessions[session_token]
    if datetime.now() > session["expires_at"]:
        del admin_sessions[session_token]
        return False
    
    return True

def get_admin_login_page() -> str:
    """Генерация страницы входа в админку"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Login - Medical Risk Analysis</title>
        <meta charset="UTF-8">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .login-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                padding: 40px;
                width: 100%;
                max-width: 400px;
                text-align: center;
            }
            
            .logo {
                font-size: 48px;
                margin-bottom: 10px;
            }
            
            h1 {
                color: #333;
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            
            .subtitle {
                color: #666;
                font-size: 14px;
                margin-bottom: 32px;
            }
            
            .form-group {
                margin-bottom: 20px;
                text-align: left;
            }
            
            label {
                display: block;
                color: #333;
                font-weight: 500;
                margin-bottom: 8px;
                font-size: 14px;
            }
            
            input[type="text"], input[type="password"] {
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e1e5e9;
                border-radius: 8px;
                font-size: 16px;
                transition: border-color 0.3s ease;
                background: #fafafa;
            }
            
            input[type="text"]:focus, input[type="password"]:focus {
                outline: none;
                border-color: #667eea;
                background: white;
            }
            
            .login-btn {
                width: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 14px 20px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                margin-top: 8px;
            }
            
            .login-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
            }
            
            .login-btn:active {
                transform: translateY(0);
            }
            
            .error {
                background: #fee;
                color: #c33;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 20px;
                border: 1px solid #fcc;
                font-size: 14px;
            }
            
            .footer {
                margin-top: 32px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #999;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <div class="logo">🏥</div>
            <h1>Admin Panel</h1>
            <p class="subtitle">Medical Risk Analysis System</p>
            
            <form method="post" action="/admin/login">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required autocomplete="username">
                </div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required autocomplete="current-password">
                </div>
                
                <button type="submit" class="login-btn">
                    🔐 Sign In to Admin Panel
                </button>
            </form>
            
            <div class="footer">
                <p>Default credentials: admin / admin123</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_admin_dashboard_page(db: Session) -> str:
    """Генерация главной страницы админки"""
    # Получаем статистику
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_projects = db.query(Project).count()
    total_risks = db.query(RiskAnalysis).count()
    
    # Получаем всех пользователей
    all_users = db.query(User).order_by(User.created_at.desc()).all()
    
    users_html = ""
    for user in all_users:
        role_class = f"role-{user.role.value}" if user.role else "role-none"
        status_class = "status-active" if user.is_active else "status-inactive"
        status_text = "Active" if user.is_active else "Inactive"
        action_text = "Deactivate" if user.is_active else "Activate"
        action_color = "#dc2626" if user.is_active else "#16a34a"
        
        # Создаем селект для ролей
        selected_sys_admin = 'selected' if user.role == UserRole.SYS_ADMIN else ''
        selected_user = 'selected' if user.role == UserRole.USER else ''
        
        role_select = f"""
            <select onchange="changeUserRole({user.id}, this.value)" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ddd; font-size: 12px;">
                <option value="USER" {selected_user}>User</option>
                <option value="SYS_ADMIN" {selected_sys_admin}>System Admin</option>
            </select>
        """
        
        users_html += f"""
            <tr>
                <td>{user.id}</td>
                <td>{user.first_name or ''} {user.last_name or ''}</td>
                <td>{user.email}</td>
                <td>{role_select}</td>
                <td><span class="{status_class}">{status_text}</span></td>
                <td>{user.created_at.strftime('%Y-%m-%d %H:%M') if user.created_at else 'N/A'}</td>
                <td>
                    <button onclick="toggleUserStatus({user.id})" 
                            style="background: {action_color}; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        {action_text}
                    </button>
                </td>
            </tr>
        """
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Dashboard - Medical Risk Analysis</title>
        <meta charset="UTF-8">
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background: #f8f9fa;
                color: #333;
            }}
            
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px 0;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }}
            
            .header-content {{
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            
            .logo {{
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 24px;
                font-weight: 600;
            }}
            
            .logout-btn {{
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                padding: 8px 16px;
                border-radius: 6px;
                text-decoration: none;
                font-size: 14px;
                transition: background 0.3s ease;
            }}
            
            .logout-btn:hover {{
                background: rgba(255,255,255,0.3);
            }}
            
            .container {{
                max-width: 1200px;
                margin: 0 auto;
                padding: 30px 20px;
            }}
            
            .stats {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }}
            
            .stat-card {{
                background: white;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                text-align: center;
                transition: transform 0.2s ease;
            }}
            
            .stat-card:hover {{
                transform: translateY(-2px);
            }}
            
            .stat-icon {{
                font-size: 32px;
                margin-bottom: 12px;
            }}
            
            .stat-number {{
                font-size: 36px;
                font-weight: 700;
                color: #333;
                margin-bottom: 8px;
            }}
            
            .stat-label {{
                font-size: 14px;
                color: #666;
                font-weight: 500;
            }}
            
            .section {{
                background: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
                margin-bottom: 30px;
            }}
            
            .section-header {{
                background: #f8f9fa;
                padding: 20px 24px;
                border-bottom: 1px solid #e9ecef;
            }}
            
            .section-title {{
                font-size: 18px;
                font-weight: 600;
                color: #333;
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            
            table {{
                width: 100%;
                border-collapse: collapse;
            }}
            
            th, td {{
                padding: 16px 24px;
                text-align: left;
                border-bottom: 1px solid #e9ecef;
            }}
            
            th {{
                background: #f8f9fa;
                font-weight: 600;
                color: #555;
                font-size: 14px;
            }}
            
            td {{
                font-size: 14px;
            }}
            
            tr:hover {{
                background: #f8f9fa;
            }}
            
            .role-badge {{
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
            }}
            
            .role-user {{
                background: #dbeafe;
                color: #2563eb;
            }}
            
            .role-sys_admin {{
                background: #fef3c7;
                color: #d97706;
            }}
            
            .status-active {{
                color: #16a34a;
                font-weight: 600;
            }}
            
            .status-inactive {{
                color: #dc2626;
                font-weight: 600;
            }}
            
            .quick-links {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-top: 30px;
            }}
            
            .quick-link {{
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                text-decoration: none;
                color: #333;
                transition: transform 0.2s ease;
            }}
            
            .quick-link:hover {{
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }}
            
            .quick-link-icon {{
                font-size: 24px;
                margin-bottom: 8px;
            }}
            
            .quick-link-title {{
                font-weight: 600;
                margin-bottom: 4px;
            }}
            
            .quick-link-desc {{
                font-size: 12px;
                color: #666;
            }}
            
            .success-message {{
                background: #dcfce7;
                color: #16a34a;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 20px;
                border: 1px solid #bbf7d0;
                display: none;
            }}
            
            .error-message {{
                background: #fee2e2;
                color: #dc2626;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 20px;
                border: 1px solid #fecaca;
                display: none;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="header-content">
                <div class="logo">
                    🏥 Medical Risk Analysis - Admin Panel
                </div>
                <a href="/admin/logout" class="logout-btn">
                    🚪 Logout
                </a>
            </div>
        </div>
        
        <div class="container">
            <div id="success-message" class="success-message"></div>
            <div id="error-message" class="error-message"></div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-number">{total_users}</div>
                    <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-number">{active_users}</div>
                    <div class="stat-label">Active Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-number">{total_projects}</div>
                    <div class="stat-label">Total Projects</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-number">{total_risks}</div>
                    <div class="stat-label">Risk Analyses</div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-header">
                    <div class="section-title">
                        👤 User Management
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users_html}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <div class="section-header">
                    <div class="section-title">
                        🔗 Quick Links
                    </div>
                </div>
                <div class="quick-links">
                    <a href="/docs" target="_blank" class="quick-link">
                        <div class="quick-link-icon">📚</div>
                        <div class="quick-link-title">API Documentation</div>
                        <div class="quick-link-desc">Swagger UI documentation</div>
                    </a>
                    <a href="/redoc" target="_blank" class="quick-link">
                        <div class="quick-link-icon">📖</div>
                        <div class="quick-link-title">ReDoc Documentation</div>
                        <div class="quick-link-desc">Alternative API docs</div>
                    </a>
                    <a href="http://localhost:3000" target="_blank" class="quick-link">
                        <div class="quick-link-icon">🌐</div>
                        <div class="quick-link-title">Frontend App</div>
                        <div class="quick-link-desc">Main application</div>
                    </a>
                    <a href="/admin" class="quick-link">
                        <div class="quick-link-icon">🔄</div>
                        <div class="quick-link-title">Refresh Dashboard</div>
                        <div class="quick-link-desc">Reload this page</div>
                    </a>
                </div>
            </div>
        </div>
        
        <script>
            function showMessage(message, isSuccess = true) {{
                const successEl = document.getElementById('success-message');
                const errorEl = document.getElementById('error-message');
                
                if (isSuccess) {{
                    successEl.textContent = message;
                    successEl.style.display = 'block';
                    errorEl.style.display = 'none';
                }} else {{
                    errorEl.textContent = message;
                    errorEl.style.display = 'block';
                    successEl.style.display = 'none';
                }}
                
                setTimeout(() => {{
                    successEl.style.display = 'none';
                    errorEl.style.display = 'none';
                }}, 5000);
            }}
            
            async function toggleUserStatus(userId) {{
                if (!confirm('Изменить статус пользователя?')) {{
                    return;
                }}
                
                try {{
                    const response = await fetch(`/admin/users/${{userId}}/toggle`, {{
                        method: 'POST',
                        credentials: 'include',
                        headers: {{
                            'Content-Type': 'application/json'
                        }}
                    }});
                    
                    if (response.ok) {{
                        const result = await response.json();
                        showMessage(result.message, true);
                        setTimeout(() => location.reload(), 1000);
                    }} else {{
                        const errorText = await response.text();
                        showMessage('Ошибка при изменении статуса пользователя: ' + errorText, false);
                    }}
                }} catch (error) {{
                    showMessage('Ошибка соединения: ' + error.message, false);
                }}
            }}
            
            async function changeUserRole(userId, newRole) {{
                if (!confirm('Изменить роль пользователя на "' + (newRole || 'No Role') + '"?')) {{
                    return;
                }}
                
                try {{
                    const response = await fetch(`/admin/users/${{userId}}/role`, {{
                        method: 'POST',
                        credentials: 'include',
                        headers: {{
                            'Content-Type': 'application/json'
                        }},
                        body: JSON.stringify({{ role: newRole }})
                    }});
                    
                    if (response.ok) {{
                        const result = await response.json();
                        showMessage(result.message, true);
                        setTimeout(() => location.reload(), 1000);
                    }} else {{
                        const errorText = await response.text();
                        showMessage('Ошибка при изменении роли пользователя: ' + errorText, false);
                    }}
                }} catch (error) {{
                    showMessage('Ошибка соединения: ' + error.message, false);
                }}
            }}
        </script>
    </body>
    </html>
    """

@router.get("/admin", response_class=HTMLResponse)
async def admin_panel(
    request: Request,
    admin_session: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Главная страница админки"""
    if not verify_admin_session(admin_session):
        return HTMLResponse(get_admin_login_page())
    
    return HTMLResponse(get_admin_dashboard_page(db))

@router.post("/admin/login")
async def admin_login(
    username: str = Form(...),
    password: str = Form(...)
):
    """Обработка входа в админку"""
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session_token = create_admin_session(username)
        response = RedirectResponse(url="/admin", status_code=303)
        response.set_cookie(
            key="admin_session",
            value=session_token,
            max_age=86400,  # 24 часа
            httponly=True,
            secure=False  # Для разработки, в продакшене должно быть True
        )
        return response
    else:
        # Возвращаем страницу входа с ошибкой
        login_page = get_admin_login_page()
        error_page = login_page.replace(
            '<form method="post"',
            '<div class="error">❌ Invalid username or password</div><form method="post"'
        )
        return HTMLResponse(error_page, status_code=401)

@router.post("/admin/users/{user_id}/toggle")
async def toggle_user_status_admin(
    user_id: int,
    admin_session: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Переключить статус пользователя (только для админов)"""
    if not verify_admin_session(admin_session):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = not user.is_active
    db.commit()
    
    status_text = "активирован" if user.is_active else "деактивирован"
    return {"message": f"Пользователь {status_text} успешно"}

@router.post("/admin/users/{user_id}/role")
async def change_user_role_admin(
    user_id: int,
    role_data: dict,
    admin_session: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Изменить роль пользователя (только для админов)"""
    if not verify_admin_session(admin_session):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_role = role_data.get("role")
    
    # Преобразуем строку роли в enum
    if new_role:
        try:
            user.role = UserRole(new_role)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")
    else:
        user.role = UserRole.USER  # Default to USER role
    
    db.commit()
    
    role_text = new_role if new_role else "No Role"
    return {"message": f"Роль пользователя изменена на '{role_text}' успешно"}

@router.get("/admin/logout")
async def admin_logout(admin_session: Optional[str] = Cookie(None)):
    """Выход из админки"""
    if admin_session and admin_session in admin_sessions:
        del admin_sessions[admin_session]
    
    response = RedirectResponse(url="/admin", status_code=303)
    response.delete_cookie("admin_session")
    return response
