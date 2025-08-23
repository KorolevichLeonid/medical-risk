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
    device_name: str
    device_model: Optional[str] = None
    device_purpose: Optional[str] = None
    device_description: Optional[str] = None
    device_classification: Optional[str] = None
    intended_use: Optional[str] = None
    user_profile: Optional[str] = None
    operating_environment: Optional[str] = None
    technical_specs: Optional[str] = None
    regulatory_requirements: Optional[str] = None
    standards: Optional[str] = None
    contact_type: Optional[str] = "no_contact"
    duration: Optional[str] = "temporary"
    invasiveness: Optional[str] = "non_invasive"
    energy_source: Optional[str] = "none"


class ProjectCreate(ProjectBase):
    """Schema for creating a new project"""
    status: Optional[ProjectStatus] = ProjectStatus.DRAFT


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
    technical_specs: Optional[str] = None
    regulatory_requirements: Optional[str] = None
    standards: Optional[str] = None
    contact_type: Optional[str] = None
    duration: Optional[str] = None
    invasiveness: Optional[str] = None
    energy_source: Optional[str] = None


class ProjectMemberBase(BaseModel):
    """Base project member schema"""
    user_id: int
    role: ProjectRole = ProjectRole.DOCTOR


class ProjectMemberCreate(ProjectMemberBase):
    """Schema for adding a project member"""
    pass


class ProjectMemberResponse(BaseModel):
    """Schema for project member response"""
    id: int
    project_id: int
    user_id: int
    role: str  # String for compatibility with existing frontend
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

    class Config:
        from_attributes = True
