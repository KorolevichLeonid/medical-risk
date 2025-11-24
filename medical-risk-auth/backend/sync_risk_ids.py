"""
Script to synchronize risk_id for all existing risk table rows.
This calls the sync API endpoint for each project to ensure all rows have proper risk_id.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import DATABASE_URL
from app.models.project import Project
from app.routers.risk_analyses import sync_risk_to_table

def sync_all_risk_ids():
    """Sync risk_id for all risks in all projects"""
    
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("Starting risk_id synchronization...")
        
        # Get all projects
        projects = db.query(Project).all()
        print(f"Found {len(projects)} projects")
        
        for project in projects:
            print(f"\n  Processing project: {project.name} (ID: {project.id})")
            
            # Get all risk factors for this project
            from app.models.risk_analysis import RiskAnalysis
            
            analysis = db.query(RiskAnalysis).filter(
                RiskAnalysis.project_id == project.id
            ).order_by(RiskAnalysis.created_at.desc()).first()
            
            if not analysis:
                print(f"    No risk analysis found for project {project.id}")
                continue
            
            if not analysis.risk_factors:
                print(f"    No risk factors found for project {project.id}")
                continue
            
            print(f"    Found {len(analysis.risk_factors)} risk factors")
            synced_count = 0
            
            # Sync each risk factor
            for factor in analysis.risk_factors:
                try:
                    # Use asyncio to run the async function
                    import asyncio
                    asyncio.run(sync_risk_to_table(db, factor, project.id))
                    synced_count += 1
                except Exception as e:
                    print(f"      [ERROR] Failed to sync risk {factor.id}: {str(e)}")
            
            print(f"    Synced {synced_count} risks for project {project.id}")
        
        print(f"\n[SUCCESS] Synchronization completed!")
        
    except Exception as e:
        print(f"\n[ERROR] Synchronization failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()
        print("\nDatabase connection closed")

if __name__ == "__main__":
    print("=" * 60)
    print("RISK ID SYNCHRONIZATION")
    print("=" * 60)
    print()
    
    response = input("This will sync risk_id for all risks. Continue? (yes/no): ")
    if response.lower() == 'yes':
        sync_all_risk_ids()
    else:
        print("Synchronization cancelled")

