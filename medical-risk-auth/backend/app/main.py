from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import text

from .database import engine, get_db
from .init_db import ensure_project_severity_columns, run_postgresql_migration
from .models import user, project, risk_analysis
from .models import changelog as changelog_model
from .models import document as document_model
from .routers import auth, users, projects, risk_analyses, risk_tables, changelog, documents, permissions
from . import admin_auth
from .core.config import settings

# Create database tables
user.Base.metadata.create_all(bind=engine)
project.Base.metadata.create_all(bind=engine)
risk_analysis.Base.metadata.create_all(bind=engine)
changelog_model.Base.metadata.create_all(bind=engine)
document_model.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Medical Risk Analysis API",
    description="API for medical device risk analysis and project management",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
# Get allowed origins from environment or use defaults
import os
cors_origins = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
# Remove empty strings from list
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

# Default origins (development + production)
default_origins = [
    "http://localhost:3000",      # React dev server
    "http://localhost:3001",      # Alternative React dev server
    "http://127.0.0.1:3000",      # Alternative localhost
    "http://127.0.0.1:3001",      # Alternative localhost
    "https://medical-risk-frontend.onrender.com",  # Production frontend
    "https://medical-risk-backend.onrender.com",   # Production backend (for docs)
]

# Combine environment origins with defaults, remove duplicates
all_origins = list(set(default_origins + cors_origins))

# Debug output for CORS configuration
print(f"🔥 DEBUG: CORS Origins configured: {all_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(risk_analyses.router, prefix="/api/risk-analyses", tags=["risk-analyses"])
app.include_router(risk_tables.router, prefix="/api/risk-tables", tags=["risk-tables"])
app.include_router(permissions.router, prefix="/api", tags=["permissions"])
app.include_router(changelog.router)
app.include_router(admin_auth.router, tags=["admin"])
app.include_router(documents.router, tags=["documents"])


@app.on_event("startup")
def startup_migrations():
    """Ensure new columns exist when running under uvicorn."""
    ensure_project_severity_columns()
    run_postgresql_migration()

@app.get("/")
async def root():
    """Root endpoint"""
    print("🔥 DEBUG: Root endpoint called - server is running with new code!")
    return {
        "message": "Medical Risk Analysis API",
        "version": "1.0.1",  # Увеличили версию
        "docs": "/docs",
        "debug": "Server updated with new code"
    }

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Simple database connectivity check
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
