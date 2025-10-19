"""
Risk analysis models for medical devices
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Enum, Boolean
from sqlalchemy import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from datetime import datetime

from ..database import Base


class RiskManagementTable(Base):
    """Table for storing risk management table metadata for each project and sheet"""
    __tablename__ = "risk_management_tables"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    sheet_id = Column(String, nullable=False)  # e.g., 'sheet1', 'custom_sheet_123'

    # Metadata
    name = Column(String, nullable=True)
    icon = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="risk_tables")
    rows = relationship("RiskTableRow", back_populates="table", cascade="all, delete-orphan")
    columns = relationship("RiskTableColumn", back_populates="table", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<RiskManagementTable(project_id={self.project_id}, sheet_id='{self.sheet_id}')>"


class RiskTableRow(Base):
    """Individual rows in risk management tables with flexible data storage"""
    __tablename__ = "risk_table_rows"

    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("risk_management_tables.id"), nullable=False)

    # Row metadata
    row_number = Column(Integer, nullable=False)
    row_index = Column(Integer, nullable=False)  # position in table (0-based)

    # Flexible data storage using JSON (stores all column values)
    data = Column(JSON, nullable=False, default=dict)

    # Cell colors (optional)
    cell_colors = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    table = relationship("RiskManagementTable", back_populates="rows")

    def __repr__(self):
        return f"<RiskTableRow(table_id={self.table_id}, row_number={self.row_number})>"


class RiskTableColumn(Base):
    """Column definitions for risk management tables"""
    __tablename__ = "risk_table_columns"

    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("risk_management_tables.id"), nullable=False)

    # Column metadata
    key = Column(String, nullable=False)  # column key identifier
    label = Column(String, nullable=False)  # display name
    width = Column(String, nullable=True, default="150px")  # width as CSS value

    # Column position
    column_index = Column(Integer, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    table = relationship("RiskManagementTable", back_populates="columns")

    def __repr__(self):
        return f"<RiskTableColumn(table_id={self.table_id}, key='{self.key}', label='{self.label}')>"


class LifecycleStage(PyEnum):
    """Medical device lifecycle stages"""
    OPERATION = "operation"
    MAINTENANCE = "maintenance"
    STORAGE = "storage"
    TRANSPORT = "transport"
    DISPOSAL = "disposal"


class HazardCategory(PyEnum):
    """Categories of medical device hazards"""
    BIOLOGICAL_CHEMICAL = "biological_chemical"
    OPERATIONAL_INFORMATIONAL = "operational_informational"
    SOFTWARE = "software"
    ENERGY_FUNCTIONAL = "energy_functional"


class ContactType(PyEnum):
    """Types of contact with human body"""
    NO_CONTACT = "no_contact"
    SURFACE = "surface"
    INVASIVE = "invasive"


class RiskAnalysis(Base):
    """Risk analysis for medical devices"""
    __tablename__ = "risk_analyses"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # Device characteristics
    has_body_contact = Column(Boolean, default=False)
    contact_type = Column(Enum(ContactType), default=ContactType.NO_CONTACT)
    
    # Analysis metadata
    analysis_date = Column(DateTime(timezone=True), server_default=func.now())
    analyst_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="risk_analyses")
    analyst = relationship("User")
    risk_factors = relationship("RiskFactor", back_populates="analysis")

    def __repr__(self):
        return f"<RiskAnalysis(project_id={self.project_id}, analysis_date='{self.analysis_date}')>"


class RiskFactor(Base):
    """Individual risk factors in the analysis"""
    __tablename__ = "risk_factors"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("risk_analyses.id"), nullable=False)
    
    # Risk identification
    lifecycle_stage = Column(Enum(LifecycleStage), nullable=False)
    hazard_name = Column(String, nullable=False)
    hazardous_situation = Column(Text, nullable=False)
    sequence_of_events = Column(Text, nullable=False)
    harm = Column(Text, nullable=False)
    hazard_category = Column(Enum(HazardCategory), nullable=False)
    
    # Risk evaluation (now optional - filled in risk management table)
    severity_score = Column(Integer, nullable=True)  # 1-5 scale, set in risk table
    probability_score = Column(Integer, nullable=True)  # 1-5 scale, set in risk table
    risk_score = Column(Integer, nullable=True)  # calculated: severity * probability
    
    # Risk control measures (managed in risk table)
    control_measures = Column(Text, nullable=True)
    residual_risk_score = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    analysis = relationship("RiskAnalysis", back_populates="risk_factors")

    def __repr__(self):
        return f"<RiskFactor(hazard_name='{self.hazard_name}', risk_score={self.risk_score})>"
