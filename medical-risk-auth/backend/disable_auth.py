#!/usr/bin/env python3
"""
Временно отключаем аутентификацию для тестирования API
"""

from backend.app.routers.risk_tables import router
from backend.app.routers.risk_tables import check_risk_table_edit_permission, check_project_access

# Переопределяем функции проверок для обхода авторизации
def disabled_check_risk_table_edit_permission(project, user, db):
    """All users can edit tables"""
    return True

def disabled_check_project_access(db_project, current_user, db):
    """All users can access projects"""
    return True

# Заменяем оригинальные функции
router.check_risk_table_edit_permission = disabled_check_risk_table_edit_permission
router.check_project_access = disabled_check_project_access

print("Authentication disabled for testing")
