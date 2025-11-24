"""
Migration script to add risk_status field to existing risks in the database.
This script updates all RiskTableRow entries that don't have a risk_status field.
"""

import sys
import os

# Add parent directory to path to allow importing app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import DATABASE_URL
from app.models.risk_analysis import RiskTableRow

def migrate_add_risk_status():
    """Add risk_status='new' to all existing risks that don't have it"""
    
    # Create engine and session
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("Starting migration: Adding risk_status to existing risks...")
        
        # Get all risk table rows
        all_rows = db.query(RiskTableRow).all()
        print(f"Found {len(all_rows)} risk table rows")
        
        updated_count = 0
        
        for row in all_rows:
            # Check if risk_status exists in data
            if 'risk_status' not in row.data:
                # Add risk_status with default value 'new'
                row.data['risk_status'] = 'new'
                
                # Also ensure other evaluation fields are present
                if 'first_evaluation_done' not in row.data:
                    row.data['first_evaluation_done'] = False
                if 'second_evaluation_done' not in row.data:
                    row.data['second_evaluation_done'] = False
                if 'locked_after_second' not in row.data:
                    row.data['locked_after_second'] = False
                if 'is_closed' not in row.data:
                    row.data['is_closed'] = False
                
                updated_count += 1
                print(f"  [OK] Updated row {row.id} (risk_id: {row.data.get('risk_id', 'N/A')})")
        
        # Commit all changes
        db.commit()
        
        print(f"\n[SUCCESS] Migration completed successfully!")
        print(f"Updated {updated_count} out of {len(all_rows)} rows")
        print(f"{len(all_rows) - updated_count} rows already had risk_status")
        
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    print("=" * 60)
    print("RISK STATUS MIGRATION")
    print("=" * 60)
    print()
    
    # Confirm before running
    response = input("WARNING: This will update all existing risk table rows. Continue? (yes/no): ")
    if response.lower() == 'yes':
        migrate_add_risk_status()
    else:
        print("Migration cancelled")

