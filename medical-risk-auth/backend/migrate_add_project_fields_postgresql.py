"""
PostgreSQL Migration script to add missing project fields to the database
"""
import os
import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

def get_database_url():
    """Get database URL from environment"""
    load_dotenv()

    # Try to get from environment, fall back to SQLite
    db_url = os.getenv("DATABASE_URL", "sqlite:///../medical_risk.db")

    # If it's SQLite, we can't use this script
    if db_url.startswith("sqlite"):
        print("This migration script is for PostgreSQL only. Current database is SQLite.")
        print("Please use migrate_add_project_fields.py for SQLite migrations.")
        return None

    return db_url

def parse_postgresql_url(db_url):
    """Parse PostgreSQL connection URL"""
    # Remove postgres:// or postgresql:// prefix
    if db_url.startswith("postgres://"):
        db_url = db_url[10:]
    elif db_url.startswith("postgresql://"):
        db_url = db_url[12:]

    # Handle authentication and host parts
    if "@" in db_url:
        auth_part, host_part = db_url.split("@", 1)
        if ":" in auth_part:
            user, password = auth_part.split(":", 1)
        else:
            user, password = auth_part, None
    else:
        host_part = db_url
        user, password = None, None

    # Handle host and database
    if "/" in host_part:
        host_port, database = host_part.split("/", 1)
    else:
        host_port, database = host_part, None

    # Handle host:port
    if ":" in host_port:
        host, port = host_port.split(":", 1)
        port = int(port)
    else:
        host, port = host_port, 5432  # Default PostgreSQL port

    return {
        "user": user,
        "password": password,
        "host": host,
        "port": port,
        "database": database
    }

def get_connection_params():
    """Get connection parameters for PostgreSQL"""
    db_url = get_database_url()
    if not db_url:
        return None

    return parse_postgresql_url(db_url)

def column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    query = sql.SQL("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
    """)
    cursor.execute(query, (table_name, column_name))
    return cursor.fetchone() is not None

def add_column_if_not_exists(conn, table_name, column_name, column_type):
    """Add a column to a table if it doesn't exist"""
    cursor = conn.cursor()

    if column_exists(cursor, table_name, column_name):
        print(f"✓ Column '{column_name}' already exists in table '{table_name}'")
        return False

    print(f"Adding column '{column_name}' to table '{table_name}'...")

    # Add the column
    query = sql.SQL("ALTER TABLE {} ADD COLUMN {} {}")
    cursor.execute(query.format(
        sql.Identifier(table_name),
        sql.Identifier(column_name),
        sql.SQL(column_type)
    ))

    print(f"✓ Added column '{column_name}' to table '{table_name}'")
    return True

def migrate_database():
    """Add missing columns to projects table"""
    conn_params = get_connection_params()
    if not conn_params:
        return

    try:
        # Connect to database
        print(f"Connecting to PostgreSQL database: {conn_params['host']}:{conn_params['port']}/{conn_params['database']}")
        conn = psycopg2.connect(
            user=conn_params['user'],
            password=conn_params['password'],
            host=conn_params['host'],
            port=conn_params['port'],
            database=conn_params['database']
        )

        # Set autocommit for DDL operations
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

        cursor = conn.cursor()

        # Check if projects table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'projects'
            )
        """)
        if not cursor.fetchone()[0]:
            print("✗ Projects table does not exist")
            return

        print("✓ Projects table exists")

        # Add manufacturer column if it doesn't exist
        add_column_if_not_exists(conn, "projects", "manufacturer", "VARCHAR(255)")

        # Add manufacturer_address column if it doesn't exist
        add_column_if_not_exists(conn, "projects", "manufacturer_address", "TEXT")

        # Add patient_population column if it doesn't exist
        add_column_if_not_exists(conn, "projects", "patient_population", "TEXT")

        # Add key_performance_characteristics column if it doesn't exist
        add_column_if_not_exists(conn, "projects", "key_performance_characteristics", "TEXT")

        # Add safety_characteristics column if it doesn't exist
        add_column_if_not_exists(conn, "projects", "safety_characteristics", "TEXT")

        # Commit changes
        conn.commit()
        print("✓ Migration completed successfully")

        # Verify the changes
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'projects'
            ORDER BY ordinal_position
        """)
        columns = [row[0] for row in cursor.fetchall()]
        print(f"Projects table now has {len(columns)} columns: {', '.join(columns)}")

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        if 'conn' in locals():
            conn.rollback()
        raise
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("Starting PostgreSQL database migration...")
    migrate_database()
    print("Migration script completed.")