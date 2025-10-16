#!/usr/bin/env python3
"""
Скрипт для настройки PostgreSQL базы данных
Запустите его один раз для создания базы данных
"""

import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import psycopg2.extras
psycopg2.extras.register_uuid()

def setup_database():
    """Настройка PostgreSQL базы данных"""
    try:
        print("Подключение к PostgreSQL...")

        # Подключаемся к PostgreSQL (к системной базе postgres)
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password="password",
            database="postgres",
            options="-c client_encoding=UTF8"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Проверяем существует ли база данных
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", ("medical_risk_db",))
        exists = cursor.fetchone()

        if not exists:
            print("Создание базы данных medical_risk_db...")
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(
                sql.Identifier("medical_risk_db")
            ))
            print("✅ База данных medical_risk_db создана!")
        else:
            print("✅ База данных medical_risk_db уже существует")

        cursor.close()
        conn.close()

        # Проверяем подключение к новой базе данных
        print("Проверка подключения к medical_risk_db...")
        test_conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password="password",
            database="medical_risk_db",
            options="-c client_encoding=UTF8"
        )
        test_conn.close()
        print("✅ Подключение к medical_risk_db успешно!")

    except psycopg2.Error as e:
        print(f"❌ Ошибка PostgreSQL: {e}")
        print("\nВозможные решения:")
        print("1. Запустите PostgreSQL сервер в pgAdmin")
        print("2. Проверьте пароль пользователя postgres")
        print("3. Убедитесь что PostgreSQL слушает на localhost:5432")
        return False

    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

    return True

if __name__ == "__main__":
    print("🔧 Настройка базы данных PostgreSQL для Medical Risk Analysis")
    print("=" * 60)

    success = setup_database()

    if success:
        print("\n🎉 База данных готова! Теперь запустите:")
        print("1. cd backend")
        print("2. python create_postgres_db.py")
        print("3. python run.py")
    else:
        print("\n❌ Не удалось настроить базу данных")
        print("Проверьте ошибки выше и повторите попытку")
