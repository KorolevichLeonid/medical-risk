"""
Project model and related schemas
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from datetime import datetime

from ..database import Base


class Permission(Base):
    """Permission model for role-based access control"""
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False)  # e.g., "view_all", "edit_source_data"
    label_ru = Column(String, nullable=False)  # Russian label for UI

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission")

    def __repr__(self):
        return f"<Permission(key='{self.key}', label_ru='{self.label_ru}')>"


class RolePermission(Base):
    """Junction table for role-permission relationships"""
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String, nullable=False)  # ProjectRole enum value
    permission_key = Column(String, ForeignKey("permissions.key"), nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    permission = relationship("Permission", back_populates="role_permissions")

    def __repr__(self):
        return f"<RolePermission(role='{self.role_name}', permission='{self.permission_key}')>"


class ProjectRole(PyEnum):
    """Project-level user roles"""
    ADMIN = "admin"                    # Project creator - full control, manages subscriptions and project settings
    MANAGER = "manager"               # Product manager
    RISK_ASSESSMENT_TEAM_LEADER = "risk_assessment_team_leader"  # Risk team leader
    DOCTOR = "doctor"                  # Doctor (severity/harm assessment)
    SPECIALIST = "specialist"          # Assigned to specific lifecycle stage, creates/edits risks only in own stage


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

    # Manufacturer information
    manufacturer = Column(String, nullable=True)
    manufacturer_address = Column(Text, nullable=True)

    # Additional device characteristics
    patient_population = Column(Text, nullable=True)
    key_performance_characteristics = Column(Text, nullable=True)
    safety_characteristics = Column(Text, nullable=True)
    
    # Technical specifications
    technical_specs = Column(Text, nullable=True)  # Now represents "Technical characteristics related to safety"
    regulatory_requirements = Column(Text, nullable=True)
    standards = Column(Text, nullable=True)
    
    # New fields for 14971 standard requirements
    indications = Column(Text, nullable=True)  # Показания
    contraindications = Column(Text, nullable=True)  # Противопоказания
    target_group = Column(Text, nullable=True)  # Целевая группа
    warnings = Column(Text, nullable=True)  # Предупреждения
    disposal = Column(Text, nullable=True)  # Утилизация
    
    # Risk assessment parameters
    contact_type = Column(String, default="no_contact")
    duration = Column(String, default="temporary")
    invasiveness = Column(String, default="non_invasive")
    energy_source = Column(String, default="none")
    
    # Project ownership
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Project configuration and lifecycle
    lifecycle_stages = Column(Text, nullable=True)  # JSON string of lifecycle stages array
    custom_lifecycle_stages = Column(Text, nullable=True)  # JSON string of custom lifecycle stages array

    # Hazard questions and configurations
    hazard_questions = Column(Text, nullable=True)  # JSON string of hazard questions object
    custom_hazard = Column(Text, nullable=True)  # Custom hazard descriptions
    hazard_checklist_answers = Column(Text, nullable=True)  # JSON string of hazard checklist answers
    active_hazard_categories = Column(Text, nullable=True)  # JSON string of active hazard categories

    @property
    def lifecycle_stages_list(self):
        """Property to get lifecycle_stages as a list"""
        if not self.lifecycle_stages:
            return []
        try:
            import json
            return json.loads(self.lifecycle_stages)
        except (json.JSONDecodeError, TypeError):
            return []

    @property
    def custom_lifecycle_stages_list(self):
        """Property to get custom_lifecycle_stages as a list"""
        if not self.custom_lifecycle_stages:
            return []
        try:
            import json
            return json.loads(self.custom_lifecycle_stages)
        except (json.JSONDecodeError, TypeError):
            return []

    @property
    def hazard_questions_dict(self):
        """Property to get hazard_questions as a dict"""
        if not self.hazard_questions:
            return {}
        try:
            import json
            return json.loads(self.hazard_questions)
        except (json.JSONDecodeError, TypeError):
            return {}

    @property
    def hazard_checklist_answers_dict(self):
        """Property to get hazard_checklist_answers as a dict"""
        if not self.hazard_checklist_answers:
            return {}
        try:
            import json
            return json.loads(self.hazard_checklist_answers)
        except (json.JSONDecodeError, TypeError):
            return {}

    @property
    def active_hazard_categories_list(self):
        """Property to get active_hazard_categories as a list"""
        if not self.active_hazard_categories:
            return []
        try:
            import json
            return json.loads(self.active_hazard_categories)
        except (json.JSONDecodeError, TypeError):
            return []

    # Risk severity levels configuration
    severity_levels = Column(Text, nullable=True)  # JSON array of severity levels: [{level: 1, score: 1, name: "...", description: "..."}]
    probability_levels = Column(Text, nullable=True)  # JSON array of probability levels: [{level: 1, name: "...", description: "..."}]
    risk_threshold = Column(Integer, default=10)  # Threshold value for acceptable/unacceptable risk

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="owned_projects", foreign_keys=[owner_id])
    members = relationship("ProjectMember", back_populates="project")
    risk_analyses = relationship("RiskAnalysis", back_populates="project")
    versions = relationship("ProjectVersion", back_populates="project")
    risk_tables = relationship("RiskManagementTable", back_populates="project")
    document_versions = relationship("DocumentVersion", back_populates="project")

    def __repr__(self):
        return f"<Project(name='{self.name}', status='{self.status.value}')>"


class ProjectMember(Base):
    """Association table for project members"""
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(
        Enum(
            ProjectRole,
            name="projectrole",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        default=ProjectRole.SPECIALIST,
        nullable=False,
    )  # Project role
    assigned_lifecycle_stage = Column(Text, nullable=True)  # Stores one or many lifecycle stages (JSON for multi-stage)
    
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
