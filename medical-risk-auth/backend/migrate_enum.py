# Migration script: Add ADMIN to PostgreSQL enum userrole
import psycopg2
import sys

# PostgreSQL URL
DATABASE_URL = "postgresql://medical_risk_db_user:QHKxPv6M1OunwMBR4rN5XPFHx6Lg8wif@dpg-d4ib6ummcj7s73c12i70-a.oregon-postgres.render.com/medical_risk_db"

def add_admin_to_userrole():
    """Add 'ADMIN' value to userrole enum"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        cursor.execute("ALTER TYPE userrole ADD VALUE 'ADMIN';")
        conn.commit()

        print("✅ Successfully added 'ADMIN' to userrole enum")

        cursor.close()
        conn.close()
    except psycopg2.Error as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    print("Adding ADMIN to userrole enum...")
    add_admin_to_userrole()
    print("Done.")
