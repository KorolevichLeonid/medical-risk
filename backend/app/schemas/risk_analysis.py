"""
Risk analysis schemas for API requests and responses
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ..models.risk_analysis import LifecycleStage, HazardCategory, ContactType


class RiskFactorBase(BaseModel):
    """Base risk factor schema"""
    lifecycle_stage: LifecycleStage
    hazard_name: str
    hazardous_situation: str
    sequence_of_events: str
    harm: str
    hazard_category: HazardCategory
    severity_score: int  # 1-5
    probability_score: int  # 1-5
    control_measures: Optional[str] = None


class RiskFactorCreate(RiskFactorBase):
    """Schema for creating a risk factor"""
    pass


class RiskFactorUpdate(BaseModel):
    """Schema for updating a risk factor"""
    lifecycle_stage: Optional[LifecycleStage] = None
    hazard_name: Optional[str] = None
    hazardous_situation: Optional[str] = None
    sequence_of_events: Optional[str] = None
    harm: Optional[str] = None
    hazard_category: Optional[HazardCategory] = None
    severity_score: Optional[int] = None
    probability_score: Optional[int] = None
    control_measures: Optional[str] = None


class RiskFactorResponse(RiskFactorBase):
    """Schema for risk factor response"""
    id: int
    analysis_id: int
    risk_score: int
    residual_risk_score: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RiskAnalysisBase(BaseModel):
    """Base risk analysis schema"""
    has_body_contact: bool = False
    contact_type: ContactType = ContactType.NO_CONTACT


class RiskAnalysisCreate(RiskAnalysisBase):
    """Schema for creating a risk analysis"""
    risk_factors: List[RiskFactorCreate] = []


class RiskAnalysisUpdate(RiskAnalysisBase):
    """Schema for updating a risk analysis"""
    has_body_contact: Optional[bool] = None
    contact_type: Optional[ContactType] = None


class RiskAnalysisResponse(RiskAnalysisBase):
    """Schema for risk analysis response"""
    id: int
    project_id: int
    analyst_id: int
    analysis_date: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Related data
    risk_factors: List[RiskFactorResponse] = []
    
    # Calculated statistics
    total_risk_factors: int = 0
    high_risk_count: int = 0  # risk_score >= 15
    medium_risk_count: int = 0  # 10 <= risk_score < 15
    low_risk_count: int = 0  # risk_score < 10

    class Config:
        from_attributes = True


class RiskAnalysisSummary(BaseModel):
    """Schema for risk analysis summary"""
    project_id: int
    project_name: str
    device_name: str
    total_risk_factors: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    analysis_date: datetime
    analyst_name: str

    class Config:
        from_attributes = True

