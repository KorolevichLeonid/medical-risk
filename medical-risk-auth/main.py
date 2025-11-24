import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.database import engine, get_db
from backend.app.models import user, project, risk_analysis
from backend.app.models import changelog as changelog_model
from backend.app.models import document as document_model
from backend.app.routers import auth, users, projects, risk_analyses, risk_tables, changelog, documents, permissions
from backend.app import admin_auth
from backend.app.core.config import settings

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # React dev server
        "http://localhost:3001",      # Alternative React dev server
        "http://127.0.0.1:3000",      # Alternative localhost
        "http://127.0.0.1:3001",      # Alternative localhost
        "*"  # Allow all origins for development (remove in production!)
    ],
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

static_dir = os.path.join(os.path.dirname(__file__), "build", "static")
build_root = os.path.join(os.path.dirname(__file__), "build")

# Mount static files for React app
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def read_root():
    return FileResponse(os.path.join(build_root, "index.html"))

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api") or full_path.startswith("static"):
        raise HTTPException(404)
    return FileResponse(os.path.join(build_root, "index.html"))

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
