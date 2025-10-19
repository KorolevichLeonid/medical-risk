"""
Migration script: Make severity_score, probability_score, and risk_score nullable in risk_factors table
"""
import sqlite3
import shutil
from datetime import datetime

# Backup database first
DB_PATH = "medical_risk.db"
BACKUP_PATH = f"medical_risk_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"

print("=" * 60)
print("MIGRATION: Make risk scores nullable")
print("=" * 60)

# Step 1: Create backup
print(f"\n1. Creating backup: {BACKUP_PATH}")
shutil.copy2(DB_PATH, BACKUP_PATH)
print(f"✅ Backup created successfully")

# Step 2: Connect to database
print(f"\n2. Connecting to database: {DB_PATH}")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
print(f"✅ Connected")

# Step 3: Check current schema
print(f"\n3. Checking current schema...")
cursor.execute("PRAGMA table_info(risk_factors)")
columns = cursor.fetchall()
print(f"Current columns:")
for col in columns:
    print(f"  - {col[1]}: {col[2]} (nullable: {col[3] == 0})")

# Step 4: Create new table with correct schema
print(f"\n4. Creating new table with nullable scores...")

create_new_table_sql = """
CREATE TABLE risk_factors_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL,
    lifecycle_stage VARCHAR NOT NULL,
    hazard_name VARCHAR NOT NULL,
    hazardous_situation TEXT NOT NULL,
    sequence_of_events TEXT NOT NULL,
    harm TEXT NOT NULL,
    hazard_category VARCHAR NOT NULL,
    severity_score INTEGER,  -- NOW NULLABLE
    probability_score INTEGER,  -- NOW NULLABLE
    risk_score INTEGER,  -- NOW NULLABLE
    control_measures TEXT,
    residual_risk_score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY(analysis_id) REFERENCES risk_analyses(id)
)
"""

cursor.execute(create_new_table_sql)
print(f"✅ New table created")

# Step 5: Copy data from old table to new table
print(f"\n5. Copying data from old table to new table...")

copy_data_sql = """
INSERT INTO risk_factors_new 
    (id, analysis_id, lifecycle_stage, hazard_name, hazardous_situation, 
     sequence_of_events, harm, hazard_category, severity_score, probability_score, 
     risk_score, control_measures, residual_risk_score, created_at, updated_at)
SELECT 
    id, analysis_id, lifecycle_stage, hazard_name, hazardous_situation, 
    sequence_of_events, harm, hazard_category, severity_score, probability_score, 
    risk_score, control_measures, residual_risk_score, created_at, updated_at
FROM risk_factors
"""

cursor.execute(copy_data_sql)
rows_copied = cursor.rowcount
print(f"✅ Copied {rows_copied} rows")

# Step 6: Drop old table and rename new table
print(f"\n6. Replacing old table with new table...")
cursor.execute("DROP TABLE risk_factors")
cursor.execute("ALTER TABLE risk_factors_new RENAME TO risk_factors")
print(f"✅ Table replaced")

# Step 7: Commit changes
print(f"\n7. Committing changes...")
conn.commit()
print(f"✅ Changes committed")

# Step 8: Verify new schema
print(f"\n8. Verifying new schema...")
cursor.execute("PRAGMA table_info(risk_factors)")
columns = cursor.fetchall()
print(f"New columns:")
for col in columns:
    nullable = "YES" if col[3] == 0 else "NO"
    print(f"  - {col[1]}: {col[2]} (nullable: {nullable})")

# Step 9: Verify data integrity
print(f"\n9. Verifying data integrity...")
cursor.execute("SELECT COUNT(*) FROM risk_factors")
count = cursor.fetchone()[0]
print(f"✅ Total rows in risk_factors: {count}")

# Close connection
conn.close()

print(f"\n" + "=" * 60)
print(f"✅ MIGRATION COMPLETED SUCCESSFULLY")
print(f"=" * 60)
print(f"\nBackup saved to: {BACKUP_PATH}")
print(f"If something goes wrong, you can restore from backup:")
print(f"  cp {BACKUP_PATH} {DB_PATH}")
print(f"\n")

