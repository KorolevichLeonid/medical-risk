#!/usr/bin/env python3
"""
Миграция для добавления новых полей в таблицу projects
"""

import sqlite3
import sys
import os

def migrate_database():
    """Добавляет новые поля в существующую базу данных"""
    
    # Используем правильный путь к базе данных (на уровень выше папки backend)
    db_path = '../../medical_risk.db'
    
    if not os.path.exists(db_path):
        print(f"❌ База данных {db_path} не найдена!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Проверим текущую структуру таблицы
        cursor.execute('PRAGMA table_info(projects)')
        existing_columns = [col[1] for col in cursor.fetchall()]
        
        # Новые колонки, которые нужно добавить
        new_columns = [
            ('technical_specs', 'TEXT'),
            ('indications', 'TEXT'),
            ('contraindications', 'TEXT'),
            ('target_group', 'TEXT'),
            ('warnings', 'TEXT'),
            ('disposal', 'TEXT')
        ]
        
        added_columns = []
        
        # Добавляем колонки, если их нет
        for col_name, col_type in new_columns:
            if col_name not in existing_columns:
                try:
                    sql = f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}"
                    cursor.execute(sql)
                    added_columns.append(col_name)
                    print(f"✅ Добавлена колонка: {col_name}")
                except Exception as e:
                    print(f"❌ Ошибка при добавлении колонки {col_name}: {e}")
                    conn.rollback()
                    return False
            else:
                print(f"ℹ️  Колонка уже существует: {col_name}")
        
        # Сохраняем изменения
        conn.commit()
        
        if added_columns:
            print(f"\n🎉 Успешно добавлено {len(added_columns)} новых колонок:")
            for col in added_columns:
                print(f"   - {col}")
        else:
            print("\nℹ️  Все колонки уже существуют в базе данных")
        
        # Проверим итоговую структуру
        cursor.execute('PRAGMA table_info(projects)')
        final_columns = [col[1] for col in cursor.fetchall()]
        
        print(f"\n📋 Итоговое количество колонок в таблице projects: {len(final_columns)}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при выполнении миграции: {e}")
        if 'conn' in locals():
            conn.rollback()
        return False

if __name__ == '__main__':
    print("🚀 Запуск миграции базы данных...")
    print("=" * 50)
    
    success = migrate_database()
    
    print("=" * 50)
    if success:
        print("✅ Миграция завершена успешно!")
        print("\nТеперь можно перезапустить backend сервер:")
        print("   python run.py")
    else:
        print("❌ Миграция завершилась с ошибкой!")
        sys.exit(1)