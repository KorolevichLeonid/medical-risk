"""
ChangeLog schemas for API
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

from ..models.changelog import ActionType


class ChangeLogResponse(BaseModel):
    """Schema for changelog response"""
    id: int
    action_type: ActionType
    action_description: str
    action_display_name: str
    
    # User info
    user_id: int
    user_name: str
    user_role: str
    
    # Target info
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    target_name: Optional[str] = None
    
    # Project info
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    
    # Change details
    old_values: Optional[str] = None
    new_values: Optional[str] = None
    extra_data: Optional[str] = None
    
    # Timestamp
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChangeLogListResponse(BaseModel):
    """Schema for changelog list response with pagination"""
    changelogs: List[ChangeLogResponse]
    total: int
    page: int
    size: int
    total_pages: int


class ProjectChangeLogResponse(BaseModel):
    """Schema for project changelog response"""
    project_id: int
    project_name: str
    project_status: str
    project_description: Optional[str] = None
    device_name: str = Field(..., description="Название медицинского устройства")
    
    # Project metadata
    members_count: int = Field(..., description="Количество участников проекта")
    last_updated: datetime = Field(..., description="Дата последнего обновления проекта")
    
    # Recent changes (last 4)
    recent_changes: List[ChangeLogResponse]
    
    # Total changes count
    total_changes: int


class ProjectsChangeLogResponse(BaseModel):
    """Schema for all projects changelog response"""
    projects: List[ProjectChangeLogResponse]
    total_projects: int


class ChangeLogDetailResponse(BaseModel):
    """Schema for detailed changelog response"""
    id: int
    action_type: ActionType
    action_description: str
    action_display_name: str
    
    # User info
    user_id: int
    user_name: str
    user_email: str
    user_role: str
    user_position: Optional[str] = None
    
    # Target info
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    target_name: Optional[str] = None
    
    # Project info
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    
    # Detailed change information
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    extra_data: Optional[Dict[str, Any]] = None
    
    # Technical details
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Timestamp
    created_at: datetime
    
    class Config:
        from_attributes = True


class CreateChangeLogRequest(BaseModel):
    """Schema for creating changelog entry"""
    action_type: ActionType
    action_description: str
    
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    target_name: Optional[str] = None
    
    project_id: Optional[int] = None
    
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    extra_data: Optional[Dict[str, Any]] = None
    
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
