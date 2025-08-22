"""
Application configuration settings
"""
import os
from typing import List

try:
    from pydantic import BaseSettings
except ImportError:
    # Fallback for older pydantic versions
    from pydantic import BaseModel as BaseSettings

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # dotenv is optional
    pass


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    app_name: str = "Medical Risk Analysis API"
    app_version: str = "1.0.0"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Database
    database_url: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./medical_risk.db"  # SQLite для разработки
    )
    
    # Security
    secret_key: str = os.getenv(
        "SECRET_KEY", 
        "your-secret-key-change-this-in-production"
    )
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]
    
    # File uploads
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    upload_dir: str = "uploads"
    
    class Config:
        env_file = ".env"


settings = Settings()
