"""
Document schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DocumentVersionBase(BaseModel):
    """Base document version schema"""
    version: str
    report_number: Optional[str] = None
    title: str = "Risk Management Report"
    document_type: str = "risk_management_report"


class DocumentVersionCreate(DocumentVersionBase):
    """Schema for creating a new document version"""
    pass


class DocumentVersionResponse(DocumentVersionBase):
    """Schema for document version response"""
    id: int
    project_id: int
    file_name: str
    file_size: Optional[int] = None
    generated_by: int
    generated_at: datetime
    is_current: bool
    created_at: datetime
    
    # Add generator information
    generator_name: Optional[str] = None
    generator_email: Optional[str] = None
    
    class Config:
        from_attributes = True


class DocumentVersionList(BaseModel):
    """Schema for listing document versions"""
    id: int
    version: str
    report_number: Optional[str] = None
    file_name: str
    file_size: Optional[int] = None
    generated_at: datetime
    is_current: bool
    generator_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class GenerateDocumentRequest(BaseModel):
    """Request schema for generating a document"""
    auto_version: bool = True  # Automatically increment version number
    version: Optional[str] = None  # Manual version number (if auto_version=False)
    report_number: Optional[str] = None  # Manual report number


class DocumentDataSnapshot(BaseModel):
    """Snapshot of data used for document generation"""
    project_info: dict
    risk_factors: list
    risk_table_data: dict
    team_members: list
    generated_at: datetime

