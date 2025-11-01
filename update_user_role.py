import sqlite3

try:
    conn = sqlite3.connect('medical_risk.db')
    cursor = conn.cursor()

    # Update user role to SYS_ADMIN
    cursor.execute('UPDATE users SET role = "SYS_ADMIN" WHERE email = "kotlovskiy2006"')
    conn.commit()

    # Check the updated user
    cursor.execute('SELECT id, email, role FROM users WHERE email = "kotlovskiy2006"')
    user = cursor.fetchone()
    print(f'Updated user: ID={user[0]}, Email={user[1]}, Role={user[2]}')

    conn.close()
except Exception as e:
    print(f"Error: {e}")
