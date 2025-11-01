import sqlite3

try:
    conn = sqlite3.connect('medical_risk.db')
    cursor = conn.cursor()

    # Check users
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    print(f"Users count: {user_count}")

    if user_count > 0:
        cursor.execute("SELECT id, email, first_name, last_name, role FROM users LIMIT 5")
        users = cursor.fetchall()
        print("Sample users:")
        for user in users:
            print(f"  ID: {user[0]}, Email: {user[1]}, Name: {user[2]} {user[3]}, Role: {user[4]}")

    # Check project members
    cursor.execute("SELECT COUNT(*) FROM project_members")
    member_count = cursor.fetchone()[0]
    print(f"Project members count: {member_count}")

    if member_count > 0:
        cursor.execute("SELECT project_id, user_id, role FROM project_members LIMIT 5")
        members = cursor.fetchall()
        print("Sample project members:")
        for member in members:
            print(f"  Project: {member[0]}, User: {member[1]}, Role: {member[2]}")

    # Test the complex query from projects.py
    print("\nTesting complex projects query...")
    try:
        cursor.execute("""
            SELECT p.id, p.name, p.status, p.owner_id
            FROM projects p
            LEFT JOIN project_members pm ON p.id = pm.project_id
            GROUP BY p.id
            LIMIT 5
        """)
        results = cursor.fetchall()
        print(f"Complex query returned {len(results)} rows")
        for row in results:
            print(f"  Project ID: {row[0]}, Name: {row[1]}, Status: {row[2]}, Owner: {row[3]}")
    except Exception as e:
        print(f"Complex query failed: {e}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
