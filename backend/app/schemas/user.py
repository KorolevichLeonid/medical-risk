"""
User schemas for API requests and responses
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from ..models.user import UserRole


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole = UserRole.USER  # Default role for new users
    language: str = "en"
    is_active: bool = True


class UserCreate(UserBase):
    """Schema for creating a new user (admin only)"""
    azure_object_id: Optional[str] = None


class UserUpdate(BaseModel):
    """Schema for updating user information"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    language: Optional[str] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    timezone: Optional[str] = None
    email_notifications: Optional[bool] = None
    browser_notifications: Optional[bool] = None
    mobile_notifications: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user response"""
    id: int
    is_verified: bool
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    timezone: Optional[str] = None
    email_notifications: Optional[bool] = None
    browser_notifications: Optional[bool] = None
    mobile_notifications: Optional[bool] = None
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True



