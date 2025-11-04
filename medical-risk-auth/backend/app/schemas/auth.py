"""
Authentication schemas for Azure Entra ID
"""
from pydantic import BaseModel, EmailStr
from typing import Optional


class AzureTokenLogin(BaseModel):
    """Schema for Azure token login"""
    azure_token: str


class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Schema for token data"""
    email: Optional[str] = None
    object_id: Optional[str] = None

