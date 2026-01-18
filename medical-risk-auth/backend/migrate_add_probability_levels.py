"""
Migration script to add probability_levels column to projects table
"""
import sqlite3
import json
import sys
import os

# Add parent directory to path to import database module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import DATABASE_URL

# Default probability levels (4 levels)
DEFAULT_PROBABILITY_LEVELS = [
    {
        "level": 1,
        "name": "Маловероятный",
        "description": "Маловероятно произойти (только в исключительном случае стечения нескольких редких ошибок и/или обстоятельств)"
    },
    {
        "level": 2,
        "name": "Отдаленный",
        "description": "Может произойти, но не часто (возможно для немногих устройств, один или два раза за время эксплуатации)"
    },
    {
        "level": 3,
        "name": "Эпизодический",
        "description": "Вероятно произойти (возможно для многих устройств один или два раза за время эксплуатации, или для отдельных устройств несколько раз за время эксплуатации)"
    },
    {
        "level": 4,
        "name": "Частый",
        "description": "Происходит часто (происходит для многих или всех устройств несколько раз за время эксплуатации)"
    }
]


def migrate():
    """Add probability_levels column to projects table"""
    # Extract database path from DATABASE_URL
    # Format: sqlite:///../medical_risk.db
    db_path = DATABASE_URL.replace("sqlite:///", "")

    # Handle relative paths
    if db_path.startswith(".."):
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_path)

    print(f"[*] Connecting to database: {db_path}")

    if not os.path.exists(db_path):
        print(f"[!] Database file not found: {db_path}")
        return False

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(projects)")
        columns = [col[1] for col in cursor.fetchall()]

        if "probability_levels" in columns:
            print("[i] Column already exists, skipping migration")
            return True

        print("[*] Adding probability_levels column to projects table...")

        # Add probability_levels column
        cursor.execute("ALTER TABLE projects ADD COLUMN probability_levels TEXT")
        print("[+] Added probability_levels column")

        # Set default values for existing projects
        print("[*] Setting default values for existing projects...")

        default_probability_json = json.dumps(DEFAULT_PROBABILITY_LEVELS, ensure_ascii=False)

        cursor.execute("""
            UPDATE projects
            SET probability_levels = ?
            WHERE probability_levels IS NULL OR probability_levels = ''
        """, (default_probability_json,))

        updated_count = cursor.rowcount
        print(f"[+] Updated {updated_count} projects with default values")

        conn.commit()
        print("[+] Migration completed successfully!")
        return True

    except Exception as e:
        print(f"[!] Error during migration: {str(e)}")
        conn.rollback()
        return False

    finally:
        conn.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Probability Levels Migration Script")
    print("=" * 60)

    success = migrate()

    if success:
        print("\n[+] All done! You can now use the new probability levels feature.")
        sys.exit(0)
    else:
        print("\n[!] Migration failed. Please check the errors above.")
        sys.exit(1)
