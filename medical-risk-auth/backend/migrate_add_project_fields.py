"""
Migration script to add missing project fields to the database
"""
import sqlite3
import os
from datetime import datetime

def migrate_database():
    """Add missing columns to projects table"""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'medical_risk.db')

    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(projects)")
        columns = [column[1] for column in cursor.fetchall()]

        # Add manufacturer column if it doesn't exist
        if 'manufacturer' not in columns:
            print("Adding manufacturer column...")
            cursor.execute("ALTER TABLE projects ADD COLUMN manufacturer VARCHAR")
            print("✓ Added manufacturer column")

        # Add manufacturer_address column if it doesn't exist
        if 'manufacturer_address' not in columns:
            print("Adding manufacturer_address column...")
            cursor.execute("ALTER TABLE projects ADD COLUMN manufacturer_address TEXT")
            print("✓ Added manufacturer_address column")

        # Add patient_population column if it doesn't exist
        if 'patient_population' not in columns:
            print("Adding patient_population column...")
            cursor.execute("ALTER TABLE projects ADD COLUMN patient_population TEXT")
            print("✓ Added patient_population column")

        # Add key_performance_characteristics column if it doesn't exist
        if 'key_performance_characteristics' not in columns:
            print("Adding key_performance_characteristics column...")
            cursor.execute("ALTER TABLE projects ADD COLUMN key_performance_characteristics TEXT")
            print("✓ Added key_performance_characteristics column")

        # Add safety_characteristics column if it doesn't exist
        if 'safety_characteristics' not in columns:
            print("Adding safety_characteristics column...")
            cursor.execute("ALTER TABLE projects ADD COLUMN safety_characteristics TEXT")
            print("✓ Added safety_characteristics column")

        # Commit changes
        conn.commit()
        print("✓ Migration completed successfully")

        # Verify the changes
        cursor.execute("PRAGMA table_info(projects)")
        updated_columns = [column[1] for column in cursor.fetchall()]
        print(f"Projects table now has {len(updated_columns)} columns")

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting database migration...")
    migrate_database()
    print("Migration script completed.")