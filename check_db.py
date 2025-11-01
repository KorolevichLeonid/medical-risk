import sqlite3

try:
    conn = sqlite3.connect('medical_risk.db')
    cursor = conn.cursor()

    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print("Tables in database:", [t[0] for t in tables])

    # Check projects count
    cursor.execute("SELECT COUNT(*) FROM projects")
    result = cursor.fetchone()
    print(f"Projects count: {result[0]}")

    # If there are projects, show some details
    if result[0] > 0:
        cursor.execute("SELECT id, name, status FROM projects LIMIT 5")
        projects = cursor.fetchall()
        print("Sample projects:")
        for project in projects:
            print(f"  ID: {project[0]}, Name: {project[1]}, Status: {project[2]}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
