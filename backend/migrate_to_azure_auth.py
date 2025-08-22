"""
Database migration script to update user model for Azure authentication
This script:
1. Adds azure_object_id column
2. Removes hashed_password column 
3. Updates role column to allow NULL values
4. Sets existing users to have NULL roles (admin will need to reassign)
"""

import sqlite3
import os

def migrate_database():
    db_path = "medical_risk.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return False
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Starting database migration for Azure authentication...")
        
        # Check if migration is needed
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'azure_object_id' in columns:
            print("Migration already completed!")
            return True
        
        # Start transaction
        conn.execute("BEGIN TRANSACTION")
        
        # Step 1: Create new users table with updated schema
        print("Creating new users table...")
        cursor.execute("""
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY,
                email VARCHAR UNIQUE NOT NULL,
                azure_object_id VARCHAR UNIQUE,
                first_name VARCHAR NOT NULL,
                last_name VARCHAR NOT NULL,
                role VARCHAR,  -- NULL allowed for new users
                is_active BOOLEAN DEFAULT 1,
                is_verified BOOLEAN DEFAULT 0,
                language VARCHAR DEFAULT 'en',
                avatar_url VARCHAR,
                phone VARCHAR,
                department VARCHAR,
                position VARCHAR,
                timezone VARCHAR DEFAULT 'UTC',
                email_notifications BOOLEAN DEFAULT 1,
                browser_notifications BOOLEAN DEFAULT 1,
                mobile_notifications BOOLEAN DEFAULT 0,
                last_login DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
        """)
        
        # Step 2: Copy data from old table (excluding hashed_password)
        print("Copying user data...")
        cursor.execute("""
            INSERT INTO users_new (
                id, email, first_name, last_name, role, is_active, is_verified,
                language, avatar_url, phone, department, position, timezone,
                email_notifications, browser_notifications, mobile_notifications,
                last_login, created_at, updated_at
            )
            SELECT 
                id, email, first_name, last_name, 
                CASE 
                    WHEN role = 'sys_admin' THEN NULL  -- Keep sys_admin role
                    ELSE NULL  -- Set all other roles to NULL for reassignment
                END as role,
                is_active, is_verified, language, avatar_url, phone, department, 
                position, timezone, email_notifications, browser_notifications, 
                mobile_notifications, last_login, created_at, updated_at
            FROM users
        """)
        
        # Step 3: Drop old table and rename new one
        print("Updating table structure...")
        cursor.execute("DROP TABLE users")
        cursor.execute("ALTER TABLE users_new RENAME TO users")
        
        # Step 4: Create indexes
        print("Creating indexes...")
        cursor.execute("CREATE INDEX idx_users_email ON users(email)")
        cursor.execute("CREATE INDEX idx_users_azure_id ON users(azure_object_id)")
        
        # Commit transaction
        conn.commit()
        print("✅ Database migration completed successfully!")
        
        # Show summary
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM users WHERE role IS NOT NULL")
        users_with_roles = cursor.fetchone()[0]
        
        print(f"📊 Migration Summary:")
        print(f"   - Total users: {user_count}")
        print(f"   - Users with assigned roles: {users_with_roles}")
        print(f"   - Users needing role assignment: {user_count - users_with_roles}")
        
        if user_count - users_with_roles > 0:
            print(f"⚠️  Note: {user_count - users_with_roles} users will need role assignment through Role Management")
        
        return True
        
    except Exception as e:
        # Rollback on error
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        return False
        
    finally:
        conn.close()

if __name__ == "__main__":
    success = migrate_database()
    if success:
        print("\n🎉 Migration completed! You can now restart the backend server.")
    else:
        print("\n💥 Migration failed! Please check the errors above.")
