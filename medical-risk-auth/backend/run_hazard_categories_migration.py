"""
Script to run the selected_hazard_categories migration
"""
import sqlite3
import os

# Get database path
db_path = os.path.join(os.path.dirname(__file__), 'medical_risk.db')

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check if column already exists
    cursor.execute("PRAGMA table_info(projects)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'selected_hazard_categories' in columns:
        print("✓ Column 'selected_hazard_categories' already exists in projects table")
    else:
        print("Adding 'selected_hazard_categories' column to projects table...")
        
        # Add the new column
        cursor.execute("""
            ALTER TABLE projects 
            ADD COLUMN selected_hazard_categories TEXT
        """)
        
        conn.commit()
        print("✓ Successfully added 'selected_hazard_categories' column")
    
    print("\n✓ Migration completed successfully!")
    
except Exception as e:
    print(f"\n✗ Migration failed: {e}")
    conn.rollback()
finally:
    conn.close()

