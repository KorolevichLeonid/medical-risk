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
    user.Base.metadata.create_all(bind=engine)
    project.Base.metadata.create_all(bind=engine)
    risk_analysis.Base.metadata.create_all(bind=engine)


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

    # Create tables
    create_tables()
    print("[+] Database tables created")

    # Ensure new columns exist for severity configuration
    ensure_project_severity_columns()
    print("[+] Project severity configuration ensured")

    # Ensure probability levels column exists
    ensure_project_probability_columns()
    print("[+] Project probability levels configuration ensured")

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


if __name__ == "__main__":
    init_database()
