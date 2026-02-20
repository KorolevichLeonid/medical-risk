"""
Database initialization script
"""
import json
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from .models.user import User, UserRole
from .models.project import Project, ProjectMember, ProjectVersion, Permission, RolePermission
from .models.risk_analysis import RiskAnalysis, RiskFactor

# Default severity levels (5 levels)
DEFAULT_SEVERITY_LEVELS = [
    {
        "level": 1,
        "name": "Незначительный",
        "description": "Приводит к неудобству или временному дискомфорту"
    },
    {
        "level": 2,
        "name": "Незначительный/Легкий",
        "description": "Приводит к временному повреждению или нарушению, не требующему медицинского вмешательства"
    },
    {
        "level": 3,
        "name": "Серьезный/Значительный",
        "description": "Приводит к повреждению или нарушению, требующему медицинского или хирургического вмешательства"
    },
    {
        "level": 4,
        "name": "Критический",
        "description": "Приводит к постоянному нарушению или необратимому повреждению"
    },
    {
        "level": 5,
        "name": "Катастрофический/Фатальный",
        "description": "Приводит к смерти"
    }
]

DEFAULT_RISK_THRESHOLD = 10

# Default probability levels (4 levels)
DEFAULT_PROBABILITY_LEVELS = [
    {
        "level": 1,
        "name": "Маловероятный",
        "description": "Маловероятно произойти (только в исключительном случае стечения нескольких редких ошибок и/или обстоятельств)"
    },
    {
        "level": 2,
        "name": "Отдаленный",
        "description": "Может произойти, но не часто (возможно для немногих устройств, один или два раза за время эксплуатации)"
    },
    {
        "level": 3,
        "name": "Эпизодический",
        "description": "Вероятно произойти (возможно для многих устройств один или два раза за время эксплуатации, или для отдельных устройств несколько раз за время эксплуатации)"
    },
    {
        "level": 4,
        "name": "Частый",
        "description": "Происходит часто (происходит для многих или всех устройств несколько раз за время эксплуатации)"
    }
]

def create_tables():
    """Create all database tables"""
    from .models import user, project, risk_analysis
    from .models import changelog as changelog_model
    from .models import document as document_model
    
    user.Base.metadata.create_all(bind=engine)
    project.Base.metadata.create_all(bind=engine)
    risk_analysis.Base.metadata.create_all(bind=engine)
    changelog_model.Base.metadata.create_all(bind=engine)
    document_model.Base.metadata.create_all(bind=engine)


def ensure_project_severity_columns():
    """Ensure severity_levels and risk_threshold exist and have defaults."""
    try:
        inspector = inspect(engine)
        if "projects" not in inspector.get_table_names():
            return

        columns = {col["name"] for col in inspector.get_columns("projects")}
        needs_severity = "severity_levels" not in columns
        needs_threshold = "risk_threshold" not in columns

        if not (needs_severity or needs_threshold):
            return

        default_severity_json = json.dumps(DEFAULT_SEVERITY_LEVELS, ensure_ascii=False)

        with engine.begin() as conn:
            is_sqlite = engine.url.drivername.startswith("sqlite")
            
            if needs_severity:
                if is_sqlite:
                    # SQLite doesn't support IF NOT EXISTS in ALTER TABLE
                    try:
                        conn.execute(text("ALTER TABLE projects ADD COLUMN severity_levels TEXT"))
                    except Exception as e:
                        # Column might already exist, ignore error
                        if "duplicate column" not in str(e).lower():
                            raise
                else:
                    # PostgreSQL supports IF NOT EXISTS
                    conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS severity_levels TEXT"))
            
            if needs_threshold:
                if is_sqlite:
                    try:
                        conn.execute(text("ALTER TABLE projects ADD COLUMN risk_threshold INTEGER DEFAULT 10"))
                    except Exception as e:
                        if "duplicate column" not in str(e).lower():
                            raise
                else:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS risk_threshold INTEGER DEFAULT 10"))

            conn.execute(
                text(
                    """
                    UPDATE projects
                    SET severity_levels = :severity,
                        risk_threshold = COALESCE(risk_threshold, :risk_threshold)
                    WHERE severity_levels IS NULL OR severity_levels = ''
                    """
                ),
                {"severity": default_severity_json, "risk_threshold": DEFAULT_RISK_THRESHOLD},
            )
    except Exception as e:
        print(f"[!] Error ensuring project severity columns: {e}")
        raise


def ensure_project_extended_columns():
    """Ensure newer project columns exist for both SQLite and PostgreSQL."""
    try:
        inspector = inspect(engine)
        if "projects" not in inspector.get_table_names():
            return

        columns = {col["name"] for col in inspector.get_columns("projects")}
        is_sqlite = engine.url.drivername.startswith("sqlite")

        columns_to_add = {
            "manufacturer": "VARCHAR(255)",
            "manufacturer_address": "TEXT",
            "patient_population": "TEXT",
            "key_performance_characteristics": "TEXT",
            "safety_characteristics": "TEXT",
            "technical_specs": "TEXT",
            "regulatory_requirements": "TEXT",
            "standards": "TEXT",
            "contact_type": "VARCHAR(50)",
            "duration": "VARCHAR(50)",
            "invasiveness": "VARCHAR(50)",
            "energy_source": "VARCHAR(50)",
            "lifecycle_stages": "TEXT",
            "custom_lifecycle_stages": "TEXT",
            "hazard_questions": "TEXT",
            "custom_hazard": "TEXT",
            "hazard_checklist_answers": "TEXT",
            "active_hazard_categories": "TEXT",
        }

        with engine.begin() as conn:
            for column_name, column_type in columns_to_add.items():
                if column_name in columns:
                    continue
                if is_sqlite:
                    try:
                        conn.execute(
                            text(f"ALTER TABLE projects ADD COLUMN {column_name} {column_type}")
                        )
                    except Exception as e:
                        if "duplicate column" not in str(e).lower():
                            raise
                else:
                    conn.execute(
                        text(
                            f"ALTER TABLE projects ADD COLUMN IF NOT EXISTS {column_name} {column_type}"
                        )
                    )
    except Exception as e:
        print(f"[!] Error ensuring project extended columns: {e}")
        raise


def ensure_project_probability_columns():
    """Ensure probability_levels exist and have defaults."""
    try:
        inspector = inspect(engine)
        if "projects" not in inspector.get_table_names():
            return

        columns = {col["name"] for col in inspector.get_columns("projects")}
        needs_probability = "probability_levels" not in columns

        if not needs_probability:
            return

        default_probability_json = json.dumps(DEFAULT_PROBABILITY_LEVELS, ensure_ascii=False)

        with engine.begin() as conn:
            is_sqlite = engine.url.drivername.startswith("sqlite")
            
            if needs_probability:
                if is_sqlite:
                    # SQLite doesn't support IF NOT EXISTS in ALTER TABLE
                    try:
                        conn.execute(text("ALTER TABLE projects ADD COLUMN probability_levels TEXT"))
                    except Exception as e:
                        # Column might already exist, ignore error
                        if "duplicate column" not in str(e).lower():
                            raise
                else:
                    # PostgreSQL supports IF NOT EXISTS
                    conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS probability_levels TEXT"))

            conn.execute(
                text(
                    """
                    UPDATE projects
                    SET probability_levels = :probability
                    WHERE probability_levels IS NULL OR probability_levels = ''
                    """
                ),
                {"probability": default_probability_json},
            )
    except Exception as e:
        print(f"[!] Error ensuring project probability columns: {e}")
        raise


def ensure_project_member_extended_columns():
    """Ensure newer project_members columns exist for both SQLite and PostgreSQL."""
    try:
        inspector = inspect(engine)
        if "project_members" not in inspector.get_table_names():
            return

        columns = {col["name"] for col in inspector.get_columns("project_members")}
        is_sqlite = engine.url.drivername.startswith("sqlite")

        if "assigned_lifecycle_stage" in columns:
            return

        with engine.begin() as conn:
            if is_sqlite:
                try:
                    conn.execute(
                        text("ALTER TABLE project_members ADD COLUMN assigned_lifecycle_stage VARCHAR(255)")
                    )
                except Exception as e:
                    if "duplicate column" not in str(e).lower():
                        raise
            else:
                conn.execute(
                    text(
                        "ALTER TABLE project_members ADD COLUMN IF NOT EXISTS assigned_lifecycle_stage VARCHAR(255)"
                    )
                )
    except Exception as e:
        print(f"[!] Error ensuring project member extended columns: {e}")
        raise


def ensure_project_member_roles_normalized():
    """Normalize legacy project member roles to current enum values."""
    try:
        inspector = inspect(engine)
        if "project_members" not in inspector.get_table_names():
            return

        # Check if there are any records to update
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM project_members"))
            count = result.scalar()
            if count == 0:
                print("[i] No project members to normalize, skipping")
                return

        is_sqlite = engine.url.drivername.startswith("sqlite")
        
        if is_sqlite:
            # SQLite: use string values (lowercase as defined in enum)
            with engine.begin() as conn:
                role_mapping = {
                    # legacy uppercase enum names
                    "PRODUCT_MANAGER": "manager",
                    "RISK_ASSESSMENT_TEAM_LEADER": "risk_assessment_team_leader",
                    "RISK_ASSESSMENT_TEAM_MEMBER": "specialist",
                    "DOCTOR": "doctor",
                    "QUALITY_MANAGEMENT_REPRESENTATIVE": "specialist",
                    # legacy lowercase string values (from older migrations)
                    "product_manager": "manager",
                    "risk_assessment_team_leader": "risk_assessment_team_leader",
                    "risk_assessment_team_member": "specialist",
                    "doctor": "doctor",
                    "quality_management_representative": "specialist",
                    "manager": "manager",
                    "specialist": "specialist",
                    "admin": "admin",
                }
                
                for old_role, new_role in role_mapping.items():
                    conn.execute(
                        text("UPDATE project_members SET role = :new_role WHERE role = :old_role"),
                        {"new_role": new_role, "old_role": old_role}
                    )
        else:
            # PostgreSQL: Use safe mapping to only known enum values
            # Map all legacy roles to safe defaults that exist in old enum: ADMIN, MANAGER, DOCTOR
            with engine.begin() as conn:
                safe_role_mapping = {
                    # Map all legacy roles to safe defaults
                    "PRODUCT_MANAGER": "MANAGER",
                    "RISK_ASSESSMENT_TEAM_LEADER": "MANAGER",
                    "RISK_ASSESSMENT_TEAM_MEMBER": "MANAGER",
                    "QUALITY_MANAGEMENT_REPRESENTATIVE": "MANAGER",
                    "product_manager": "MANAGER",
                    "risk_assessment_team_leader": "MANAGER",
                    "risk_assessment_team_member": "MANAGER",
                    "quality_management_representative": "MANAGER",
                    "manager": "MANAGER",
                    "specialist": "MANAGER",  # Map to MANAGER if SPECIALIST doesn't exist
                    "admin": "ADMIN",
                    "ADMIN": "ADMIN",
                    "MANAGER": "MANAGER",
                    "DOCTOR": "DOCTOR",
                    "doctor": "DOCTOR",
                }
                
                # Only update roles that actually exist in the table
                for old_role, new_role in safe_role_mapping.items():
                    try:
                        # Check if any rows match before updating
                        check_result = conn.execute(
                            text("SELECT COUNT(*) FROM project_members WHERE CAST(role AS text) = :old_role"),
                            {"old_role": old_role}
                        )
                        if check_result.scalar() > 0:
                            # Try to update, catch errors if enum value doesn't exist
                            conn.execute(
                                text("UPDATE project_members SET role = CAST(:new_role AS projectrole) WHERE CAST(role AS text) = :old_role"),
                                {"new_role": new_role, "old_role": old_role}
                            )
                    except Exception as update_error:
                        # If enum value doesn't exist, skip this mapping silently
                        # This is expected if the enum doesn't have all new values yet
                        pass
                        
    except Exception as e:
        print(f"[!] Error normalizing project member roles: {e}")
        # Don't raise - this is not critical for app startup
        print("[!] Continuing despite role normalization error...")


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


def create_admin_user():
    """Check if any admin user exists for Azure auth system"""
    db = SessionLocal()
    try:
        # Check if any admin user exists
        admin_count = db.query(User).filter(User.role == UserRole.SYS_ADMIN).count()
        if admin_count == 0:
            print("[!] No system administrator found!")
            print("   After first Azure login, manually assign sys_admin role:")
            print("   UPDATE users SET role = 'sys_admin' WHERE email = 'your-admin-email@domain.com';")
        else:
            print(f"[i] Found {admin_count} system administrator(s)")
    finally:
        db.close()


def init_database():
    """Initialize the database with tables and sample data"""
    print("[*] Initializing database...")

    try:
        # Create tables
        create_tables()
        print("[+] Database tables created")

        # Ensure new columns exist for severity configuration
        ensure_project_severity_columns()
        print("[+] Project severity configuration ensured")

        # Ensure extended project columns exist
        ensure_project_extended_columns()
        print("[+] Project extended columns ensured")

        # Ensure probability levels column exists
        ensure_project_probability_columns()
        print("[+] Project probability levels configuration ensured")

        # Ensure extended project member columns exist
        ensure_project_member_extended_columns()
        print("[+] Project member extended columns ensured")

        # Normalize legacy role values to current enum names
        try:
            ensure_project_member_roles_normalized()
            print("[+] Project member roles normalized")
        except Exception as e:
            print(f"[!] Warning: Could not normalize project member roles: {e}")
            print("[!] Continuing initialization...")

        # Run PostgreSQL migration if needed
        run_postgresql_migration()

        # Initialize permissions
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from init_permissions import init_permissions
        init_permissions()

        # Check admin user status (Azure auth system)
        create_admin_user()

        # Users are created automatically through Azure authentication
        print("[i] Users will be created automatically through Azure authentication")

        print("[+] Database initialization completed!")
        
    except Exception as e:
        print(f"✗ Error during database initialization: {e}")
        raise


if __name__ == "__main__":
    init_database()
