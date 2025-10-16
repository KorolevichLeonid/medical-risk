#!/usr/bin/env python3
"""
Скрипт для создания всех таблиц в PostgreSQL базе данных
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app.models.user import User, UserRole
from app.models.project import Project, ProjectMember, ProjectVersion, ProjectStatus, ProjectRole
from app.models.risk_analysis import (
    RiskAnalysis, RiskFactor, LifecycleStage, HazardCategory, ContactType,
    RiskManagementTable, RiskTableRow, RiskTableColumn
)
from app.models.changelog import ChangeLog, ActionType

def create_all_tables():
    """Создание всех таблиц в базе данных"""
    print("Создание таблиц в PostgreSQL базе данных...")

    try:
        # Создание всех таблиц
        Base.metadata.create_all(bind=engine)
        print("✅ Все таблицы успешно созданы!")

        # Проверяем подключение
        from app.database import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print("✅ Подключение к базе данных успешно!")

    except Exception as e:
        print(f"❌ Ошибка при создании таблиц: {e}")
        print("\nВозможные решения:")
        print("1. Убедитесь что PostgreSQL сервер запущен")
        print("2. Создайте базу данных 'medical_risk_db'")
        print("3. Проверьте учетные данные в app/database.py")
        print("4. Установите psycopg2: pip install psycopg2-binary")
        return False

    return True

if __name__ == "__main__":
    success = create_all_tables()
    if success:
        print("\n🎉 База данных готова к работе!")
    else:
        sys.exit(1)
