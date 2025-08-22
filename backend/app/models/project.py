"""
Project model and related schemas
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from datetime import datetime

from ..database import Base


class ProjectRole(PyEnum):
    """Project-level user roles"""
    ADMIN = "admin"      # Project creator/owner - full project control
    MANAGER = "manager"  # Project management, user management, no risk editing
    DOCTOR = "doctor"    # Risk management only


class ProjectStatus(PyEnum):
    """Project status values"""
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Project(Base):
    """Project model for medical device risk analysis"""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.DRAFT, nullable=False)
    progress_percentage = Column(Float, default=0.0)  # 0-100
    
    # Medical device information
    device_name = Column(String, nullable=False)
    device_model = Column(String, nullable=True)
    device_purpose = Column(Text, nullable=True)
    device_description = Column(Text, nullable=True)
    device_classification = Column(String, nullable=True)
    intended_use = Column(Text, nullable=True)
    user_profile = Column(Text, nullable=True)
    operating_environment = Column(Text, nullable=True)
    
    # Technical specifications
    technical_specs = Column(Text, nullable=True)
    regulatory_requirements = Column(Text, nullable=True)
    standards = Column(Text, nullable=True)
    
    # Risk assessment parameters
    contact_type = Column(String, default="no_contact")
    duration = Column(String, default="temporary")
    invasiveness = Column(String, default="non_invasive")
    energy_source = Column(String, default="none")
    
    # Project ownership
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="owned_projects", foreign_keys=[owner_id])
    members = relationship("ProjectMember", back_populates="project")
    risk_analyses = relationship("RiskAnalysis", back_populates="project")
    versions = relationship("ProjectVersion", back_populates="project")

    def __repr__(self):
        return f"<Project(name='{self.name}', status='{self.status.value}')>"


class ProjectMember(Base):
    """Association table for project members"""
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(Enum(ProjectRole), default=ProjectRole.DOCTOR, nullable=False)  # Project role
    
    # Timestamps
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")

    def __repr__(self):
        return f"<ProjectMember(project_id={self.project_id}, user_id={self.user_id})>"


class ProjectVersion(Base):
    """Project version tracking"""
    __tablename__ = "project_versions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    version = Column(String, nullable=False)  # e.g., "1.0", "1.1", "2.0"
    description = Column(Text, nullable=True)
    is_current = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="versions")

    def __repr__(self):
        return f"<ProjectVersion(project_id={self.project_id}, version='{self.version}')>"
