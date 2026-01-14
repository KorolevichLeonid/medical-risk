"""
Migration script to add severity_levels and risk_threshold columns to projects table
"""
import sqlite3
import json
import sys
import os

# Add parent directory to path to import database module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import DATABASE_URL

# Default severity levels (5 levels)
DEFAULT_SEVERITY_LEVELS = [
    {
        "level": 1,
        "name": "Незначительный",
        "description": "Приводит к неудобству или временному дискомфорту"
    },
    {
        "level": 2,
        "name": "Незначительный/Легкий",
        "description": "Приводит к временному повреждению или нарушению, не требующему медицинского вмешательства"
    },
    {
        "level": 3,
        "name": "Серьезный/Значительный",
        "description": "Приводит к повреждению или нарушению, требующему медицинского или хирургического вмешательства"
    },
    {
        "level": 4,
        "name": "Критический",
        "description": "Приводит к постоянному нарушению или необратимому повреждению"
    },
    {
        "level": 5,
        "name": "Катастрофический/Фатальный",
        "description": "Приводит к смерти"
    }
]

DEFAULT_RISK_THRESHOLD = 10


def migrate():
    """Add new columns to projects table"""
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
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(projects)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "severity_levels" in columns and "risk_threshold" in columns:
            print("[i] Columns already exist, skipping migration")
            return True
        
        print("[*] Adding new columns to projects table...")
        
        # Add severity_levels column if it doesn't exist
        if "severity_levels" not in columns:
            cursor.execute("ALTER TABLE projects ADD COLUMN severity_levels TEXT")
            print("[+] Added severity_levels column")
        
        # Add risk_threshold column if it doesn't exist
        if "risk_threshold" not in columns:
            cursor.execute("ALTER TABLE projects ADD COLUMN risk_threshold INTEGER DEFAULT 10")
            print("[+] Added risk_threshold column")
        
        # Set default values for existing projects
        print("[*] Setting default values for existing projects...")
        
        default_severity_json = json.dumps(DEFAULT_SEVERITY_LEVELS, ensure_ascii=False)
        
        cursor.execute("""
            UPDATE projects 
            SET severity_levels = ?, 
                risk_threshold = ?
            WHERE severity_levels IS NULL OR severity_levels = ''
        """, (default_severity_json, DEFAULT_RISK_THRESHOLD))
        
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
    print("Severity Levels Migration Script")
    print("=" * 60)
    
    success = migrate()
    
    if success:
        print("\n[+] All done! You can now use the new severity levels feature.")
        sys.exit(0)
    else:
        print("\n[!] Migration failed. Please check the errors above.")
        sys.exit(1)
