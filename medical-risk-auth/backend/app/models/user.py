"""
User model and related schemas
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from datetime import datetime

from ..database import Base


class UserRole(PyEnum):
    """System-level user roles"""
    USER = "USER"  # Regular user - default role for all new users
    SYS_ADMIN = "SYS_ADMIN"  # System administrator


class User(Base):
    """User model"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    azure_object_id = Column(String, unique=True, index=True, nullable=True)  # Azure Entra Object ID
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)  # Default role is USER
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    language = Column(String, default="en")  # "en" or "ru"
    avatar_url = Column(String, nullable=True)
    
    # Additional profile fields
    phone = Column(String, nullable=True)
    department = Column(String, nullable=True)
    position = Column(String, nullable=True)
    timezone = Column(String, default="UTC")
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True)
    browser_notifications = Column(Boolean, default=True)
    mobile_notifications = Column(Boolean, default=False)
    
    # Login tracking
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owned_projects = relationship("Project", back_populates="owner", foreign_keys="Project.owner_id")
    project_memberships = relationship("ProjectMember", back_populates="user")

    def __repr__(self):
        return f"<User(email='{self.email}', role='{self.role.value}')>"
