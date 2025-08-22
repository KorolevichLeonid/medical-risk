"""
Risk analysis models for medical devices
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from datetime import datetime

from ..database import Base


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
    
    # Risk evaluation
    severity_score = Column(Integer, nullable=False)  # 1-5 scale
    probability_score = Column(Integer, nullable=False)  # 1-5 scale
    risk_score = Column(Integer, nullable=False)  # calculated: severity * probability
    
    # Risk control measures (if any)
    control_measures = Column(Text, nullable=True)
    residual_risk_score = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    analysis = relationship("RiskAnalysis", back_populates="risk_factors")

    def __repr__(self):
        return f"<RiskFactor(hazard_name='{self.hazard_name}', risk_score={self.risk_score})>"

