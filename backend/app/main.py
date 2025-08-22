from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from .database import engine, get_db
from .models import user, project, risk_analysis
from .models import changelog as changelog_model
from .routers import auth, users, projects, risk_analyses, changelog
from . import admin_auth
from .core.config import settings

# Create database tables
user.Base.metadata.create_all(bind=engine)
project.Base.metadata.create_all(bind=engine)
risk_analysis.Base.metadata.create_all(bind=engine)
changelog_model.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Medical Risk Analysis API",
    description="API for medical device risk analysis and project management",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(risk_analyses.router, prefix="/api/risk-analyses", tags=["risk-analyses"])
app.include_router(changelog.router)
app.include_router(admin_auth.router, tags=["admin"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Medical Risk Analysis API",
        "version": "1.0.0",
        "docs": "/docs"
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