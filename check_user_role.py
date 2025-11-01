import sqlite3

try:
    conn = sqlite3.connect('medical_risk.db')
    cursor = conn.cursor()

    # Check the newly created user
    cursor.execute("SELECT id, email, role FROM users WHERE email = 'kotlovskiy2006'")
    user = cursor.fetchone()
    print(f"User kotlovskiy2006: ID={user[0]}, Email={user[1]}, Role={user[2]}")

    # Check if this user owns any projects
    cursor.execute("SELECT COUNT(*) FROM projects WHERE owner_id = ?", (user[0],))
    owned_projects = cursor.fetchone()[0]
    print(f"User owns {owned_projects} projects")

    # Check if this user is a member of any projects
    cursor.execute("SELECT COUNT(*) FROM project_members WHERE user_id = ?", (user[0],))
    member_projects = cursor.fetchone()[0]
    print(f"User is member of {member_projects} projects")

    # Check SYS_ADMIN users
    cursor.execute("SELECT id, email FROM users WHERE role = 'SYS_ADMIN'")
    admins = cursor.fetchall()
    print(f"SYS_ADMIN users: {admins}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
