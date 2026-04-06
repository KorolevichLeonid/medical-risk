"""
Project schemas for API requests and responses
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ..models.project import ProjectStatus, ProjectRole


class ProjectBase(BaseModel):
    """Base project schema"""
    name: str
    description: Optional[str] = None
    device_name: Optional[str] = ""
    device_model: Optional[str] = None
    device_purpose: Optional[str] = None
    device_description: Optional[str] = None
    device_classification: Optional[str] = None
    intended_use: Optional[str] = None
    user_profile: Optional[str] = None
    operating_environment: Optional[str] = None

    # Manufacturer information
    manufacturer: Optional[str] = None
    manufacturer_address: Optional[str] = None

    # Additional device characteristics
    patient_population: Optional[str] = None
    key_performance_characteristics: Optional[str] = None
    safety_characteristics: Optional[str] = None

    technical_specs: Optional[str] = None  # Technical characteristics related to safety
    regulatory_requirements: Optional[str] = None
    standards: Optional[str] = None
    
    # New fields for 14971 standard requirements
    indications: Optional[str] = None  # Показания
    contraindications: Optional[str] = None  # Противопоказания
    target_group: Optional[str] = None  # Целевая группа
    warnings: Optional[str] = None  # Предупреждения
    disposal: Optional[str] = None  # Утилизация
    contact_type: Optional[str] = "no_contact"
    duration: Optional[str] = "temporary"
    invasiveness: Optional[str] = "non_invasive"
    energy_source: Optional[str] = "none"

    # Project configuration and lifecycle
    lifecycle_stages: Optional[list] = None
    custom_lifecycle_stages: Optional[list] = None

    # Hazard questions and checklist answers
    hazard_questions: Optional[dict] = None
    custom_hazard: Optional[str] = None

    # Risk severity levels configuration
    severity_levels: Optional[list] = None  # Array of severity levels: [{level: 1, name: "...", description: "..."}]
    probability_levels: Optional[list] = None  # Array of probability levels: [{level: 1, name: "...", description: "..."}]
    risk_threshold: Optional[int] = 10  # Threshold value for acceptable/unacceptable risk


class ProjectCreate(ProjectBase):
    """Schema for creating a new project"""
    status: Optional[ProjectStatus] = ProjectStatus.DRAFT
    hazard_checklist_answers: Optional[dict] = None
    active_hazard_categories: Optional[list] = None


class ProjectUpdate(BaseModel):
    """Schema for updating project information"""
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    progress_percentage: Optional[float] = None
    device_name: Optional[str] = None
    device_model: Optional[str] = None
    device_purpose: Optional[str] = None
    device_description: Optional[str] = None
    device_classification: Optional[str] = None
    intended_use: Optional[str] = None
    user_profile: Optional[str] = None
    operating_environment: Optional[str] = None

    # Manufacturer information
    manufacturer: Optional[str] = None
    manufacturer_address: Optional[str] = None

    # Additional device characteristics
    patient_population: Optional[str] = None
    key_performance_characteristics: Optional[str] = None
    safety_characteristics: Optional[str] = None

    technical_specs: Optional[str] = None
    regulatory_requirements: Optional[str] = None
    standards: Optional[str] = None
    
    # New fields for 14971 standard requirements
    indications: Optional[str] = None  # Показания
    contraindications: Optional[str] = None  # Противопоказания
    target_group: Optional[str] = None  # Целевая группа
    warnings: Optional[str] = None  # Предупреждения
    disposal: Optional[str] = None  # Утилизация
    
    contact_type: Optional[str] = None
    duration: Optional[str] = None
    invasiveness: Optional[str] = None
    energy_source: Optional[str] = None
    lifecycle_stages: Optional[list] = None
    custom_lifecycle_stages: Optional[list] = None
    hazard_questions: Optional[dict] = None
    custom_hazard: Optional[str] = None
    severity_levels: Optional[list] = None
    probability_levels: Optional[list] = None
    risk_threshold: Optional[int] = None


class ProjectMemberBase(BaseModel):
    """Base project member schema"""
    user_id: int
    role: ProjectRole = ProjectRole.SPECIALIST
    roles: Optional[List[str]] = None  # All assigned roles (multi-role support)
    assigned_lifecycle_stage: Optional[str] = None  # Backward-compatible single stage
    assigned_lifecycle_stages: Optional[List[str]] = None  # Preferred multi-stage assignment for specialist


class ProjectMemberCreate(ProjectMemberBase):
    """Schema for adding a project member"""
    pass


class ProjectMemberRoleUpdate(BaseModel):
    """Schema for updating a project member role"""
    role: ProjectRole
    roles: Optional[List[str]] = None  # All assigned roles (multi-role support)
    assigned_lifecycle_stage: Optional[str] = None  # Backward-compatible single stage
    assigned_lifecycle_stages: Optional[List[str]] = None  # Preferred multi-stage assignment for specialist


class ProjectMemberResponse(BaseModel):
    """Schema for project member response"""
    id: int
    project_id: int
    user_id: int
    role: str  # Effective primary role (highest hierarchical or doctor)
    roles: List[str] = []  # All assigned roles
    assigned_lifecycle_stage: Optional[str] = None  # Primary stage for backward compatibility
    assigned_lifecycle_stages: Optional[List[str]] = None  # Full list of assigned lifecycle stages
    joined_at: datetime

    # User information
    user_email: str
    user_first_name: str
    user_last_name: str

    class Config:
        from_attributes = True


class ProjectVersionBase(BaseModel):
    """Base project version schema"""
    version: str
    description: Optional[str] = None


class ProjectVersionCreate(ProjectVersionBase):
    """Schema for creating a project version"""
    pass


class ProjectVersionResponse(ProjectVersionBase):
    """Schema for project version response"""
    id: int
    project_id: int
    is_current: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectResponse(ProjectBase):
    """Schema for project response"""
    id: int
    status: ProjectStatus
    progress_percentage: float
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Related data
    members: List[ProjectMemberResponse] = []
    versions: List[ProjectVersionResponse] = []
    
    # Active hazard categories calculated from hazard questions
    active_hazard_categories: List[str] = []

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    """Schema for project list response"""
    id: int
    name: str
    status: ProjectStatus
    progress_percentage: float
    device_name: str
    owner_id: int
    created_at: datetime
    member_count: int = 0
    user_role: Optional[str] = None  # Role of current user in this project
    user_roles: list = []  # All roles of current user in this project

    class Config:
        from_attributes = True
