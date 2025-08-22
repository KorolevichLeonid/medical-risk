"""
Database initialization script
"""
from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from .models.user import User, UserRole
from .models.project import Project, ProjectMember, ProjectVersion
from .models.risk_analysis import RiskAnalysis, RiskFactor
def create_tables():
    """Create all database tables"""
    from .models import user, project, risk_analysis
    user.Base.metadata.create_all(bind=engine)
    project.Base.metadata.create_all(bind=engine)
    risk_analysis.Base.metadata.create_all(bind=engine)


def create_admin_user():
    """Check if any admin user exists for Azure auth system"""
    db = SessionLocal()
    try:
        # Check if any admin user exists
        admin_count = db.query(User).filter(User.role == UserRole.SYS_ADMIN).count()
        if admin_count == 0:
            print("⚠️  No system administrator found!")
            print("   After first Azure login, manually assign sys_admin role:")
            print("   UPDATE users SET role = 'sys_admin' WHERE email = 'your-admin-email@domain.com';")
        else:
            print(f"ℹ️  Found {admin_count} system administrator(s)")
    finally:
        db.close()


def init_database():
    """Initialize the database with tables and sample data"""
    print("🔧 Initializing database...")
    
    # Create tables
    create_tables()
    print("✅ Database tables created")
    
    # Check admin user status (Azure auth system)
    create_admin_user()
    
    # Users are created automatically through Azure authentication
    print("ℹ️ Users will be created automatically through Azure authentication")
    
    print("🎉 Database initialization completed!")


if __name__ == "__main__":
    init_database()
