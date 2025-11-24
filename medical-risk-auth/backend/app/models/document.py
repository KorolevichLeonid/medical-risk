"""
Document version model for risk management reports
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, LargeBinary, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

from ..database import Base


class DocumentVersion(Base):
    """Model for storing generated Risk Management Report versions"""
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Version information
    version = Column(String, nullable=False)  # e.g., "1.0", "1.1", "2.0"
    report_number = Column(String, nullable=True)  # e.g., "RMR-2025-01"
    
    # Document metadata
    title = Column(String, nullable=False, default="Risk Management Report")
    document_type = Column(String, nullable=False, default="risk_management_report")
    
    # Generated document file (stored as binary)
    file_data = Column(LargeBinary, nullable=True)  # DOCX file data
    file_name = Column(String, nullable=False)  # Generated filename
    file_size = Column(Integer, nullable=True)  # File size in bytes
    
    # Snapshot of data at generation time (for historical reference)
    snapshot_data = Column(Text, nullable=True)  # JSON snapshot of report data
    
    # Generation information
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Status
    is_current = Column(Boolean, default=True)  # Only one version should be current at a time
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="documents")
    generator = relationship("User")

    def __repr__(self):
        return f"<DocumentVersion(project_id={self.project_id}, version='{self.version}')>"
