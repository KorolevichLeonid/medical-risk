"""
Database configuration and connection setup
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Database URL from environment variable
# Используем SQLite для простоты пока
# Путь указывает на корневую БД (на уровень выше папки backend)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///../medical_risk.db"
)

# Create SQLAlchemy engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # PostgreSQL specific configuration
    engine = create_engine(
        DATABASE_URL,
        client_encoding='utf8',
        connect_args={
            'client_encoding': 'utf8',
            'options': '-c timezone=utc'
        }
    )

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
