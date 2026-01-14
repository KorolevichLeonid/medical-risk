"""
Migration script to add score field to existing severity levels JSON data
"""
import sqlite3
import json
import sys
import os

# Add parent directory to path to import database module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import DATABASE_URL


def migrate():
    """Update existing severity levels to include score field"""
    # Extract database path from DATABASE_URL
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
        # Get all projects with severity levels
        cursor.execute("SELECT id, severity_levels FROM projects WHERE severity_levels IS NOT NULL AND severity_levels != ''")
        projects = cursor.fetchall()

        print(f"[*] Found {len(projects)} projects with severity levels")

        updated_count = 0

        for project_id, severity_json in projects:
            try:
                severity_levels = json.loads(severity_json)

                # Check if any level is missing score
                needs_update = any('score' not in level for level in severity_levels)

                if needs_update:
                    # Add score field to levels that don't have it
                    for level in severity_levels:
                        if 'score' not in level:
                            level['score'] = level['level']

                    # Update the database
                    updated_json = json.dumps(severity_levels, ensure_ascii=False)
                    cursor.execute(
                        "UPDATE projects SET severity_levels = ? WHERE id = ?",
                        (updated_json, project_id)
                    )
                    updated_count += 1
                    print(f"[+] Updated project {project_id}")

            except json.JSONDecodeError as e:
                print(f"[!] Error parsing JSON for project {project_id}: {e}")
                continue

        conn.commit()
        print(f"[+] Updated {updated_count} projects with score fields")
        return True

    except Exception as e:
        print(f"[!] Error during migration: {str(e)}")
        conn.rollback()
        return False

    finally:
        conn.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Add Scores to Severity Levels Migration Script")
    print("=" * 60)

    success = migrate()

    if success:
        print("\n[+] All done! Score fields added to existing severity levels.")
        sys.exit(0)
    else:
        print("\n[!] Migration failed. Please check the errors above.")
        sys.exit(1)
