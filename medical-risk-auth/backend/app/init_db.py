"""
Database initialization and migration functions
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from .database import engine
from .models.project import Project
import json
import logging

def init_database():
    """Initialize database - create tables and run migrations"""
    try:
        # Import models to ensure they're registered
        from .models import user, project, risk_analysis
        from .models import changelog as changelog_model
        from .models import document as document_model

        # Create database tables
        user.Base.metadata.create_all(bind=engine)
        project.Base.metadata.create_all(bind=engine)
        risk_analysis.Base.metadata.create_all(bind=engine)
        changelog_model.Base.metadata.create_all(bind=engine)
        document_model.Base.metadata.create_all(bind=engine)

        # Run migrations
        ensure_project_severity_columns()
        run_postgresql_migration()

        print("✓ Database initialization completed successfully")

    except Exception as e:
        print(f"✗ Error during database initialization: {e}")
        raise

def ensure_project_severity_columns():
    """Ensure project severity columns exist in SQLite database"""
    try:
        with engine.connect() as conn:
            # Check if severity_levels column exists
            result = conn.execute(text("PRAGMA table_info(projects)"))
            columns = [row[1] for row in result.fetchall()]

            if 'severity_levels' not in columns:
                conn.execute(text("ALTER TABLE projects ADD COLUMN severity_levels TEXT"))
                print("✓ Added severity_levels column to projects table")

            if 'probability_levels' not in columns:
                conn.execute(text("ALTER TABLE projects ADD COLUMN probability_levels TEXT"))
                print("✓ Added probability_levels column to projects table")

            if 'risk_threshold' not in columns:
                conn.execute(text("ALTER TABLE projects ADD COLUMN risk_threshold INTEGER DEFAULT 10"))
                print("✓ Added risk_threshold column to projects table")

            conn.commit()
            print("✓ Database migration completed successfully")

    except Exception as e:
        print(f"✗ Error during database migration: {e}")
        raise

def run_postgresql_migration():
    """Run PostgreSQL migration to add missing project fields"""
    try:
        # Import the migration function
        from ..migrate_add_project_fields_postgresql import migrate_database
        print("🔥 DEBUG: Running PostgreSQL migration...")
        migrate_database()
        print("✓ PostgreSQL migration completed successfully")
    except ImportError:
        print("⚠ PostgreSQL migration script not found (expected for SQLite)")
    except Exception as e:
        print(f"✗ Error during PostgreSQL migration: {e}")
        # Don't raise - this is not critical for app startup