"""
Risk analysis schemas for API requests and responses
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..models.risk_analysis import HazardCategory, ContactType


class RiskFactorBase(BaseModel):
    """Base risk factor schema"""
    lifecycle_stage: str
    hazard_name: str
    hazardous_situation: str
    sequence_of_events: str
    harm: str
    hazard_category: HazardCategory
    # These fields are now optional - filled in the risk table
    severity_score: Optional[int] = None  # 1-5, set in risk table
    probability_score: Optional[int] = None  # 1-5, set in risk table
    control_measures: Optional[str] = None  # Now managed in risk table


class RiskFactorCreate(RiskFactorBase):
    """Schema for creating a risk factor"""
    pass


class RiskFactorUpdate(BaseModel):
    """Schema for updating a risk factor"""
    lifecycle_stage: Optional[str] = None
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
    risk_score: Optional[int] = None  # Can be None until evaluated
    residual_risk_score: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    risk_status: Optional[str] = 'new'  # Status from risk management table

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


# Risk Management Table Schemas

class RiskTableColumnBase(BaseModel):
    """Base column schema"""
    key: str
    label: str
    width: Optional[str] = "150px"


class RiskTableColumnCreate(RiskTableColumnBase):
    """Schema for creating a table column"""
    column_index: int


class RiskTableColumnUpdate(BaseModel):
    """Schema for updating a table column"""
    key: Optional[str] = None
    label: Optional[str] = None
    width: Optional[str] = None
    column_index: Optional[int] = None


class RiskTableColumnResponse(RiskTableColumnBase):
    """Schema for column response"""
    id: int
    table_id: int
    column_index: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RiskTableRowBase(BaseModel):
    """Base row schema"""
    row_number: int
    row_index: int
    data: Dict[str, Any] = {}


class RiskTableRowCreate(RiskTableRowBase):
    """Schema for creating a table row"""
    cell_colors: Optional[Dict[str, str]] = None


class RiskTableRowUpdate(BaseModel):
    """Schema for updating a table row"""
    row_id: int  # Required for batch updates
    row_number: Optional[int] = None
    row_index: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
    cell_colors: Optional[Dict[str, str]] = None


class RiskTableRowResponse(RiskTableRowBase):
    """Schema for row response"""
    id: int
    table_id: int
    cell_colors: Optional[Dict[str, str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RiskManagementTableBase(BaseModel):
    """Base risk management table schema"""
    sheet_id: str
    name: Optional[str] = None
    icon: Optional[str] = None


class RiskManagementTableCreate(RiskManagementTableBase):
    """Schema for creating a risk management table"""
    columns: List[RiskTableColumnCreate] = []
    rows: List[RiskTableRowCreate] = []


class RiskManagementTableUpdate(BaseModel):
    """Schema for updating a risk management table"""
    sheet_id: Optional[str] = None
    name: Optional[str] = None
    icon: Optional[str] = None


class RiskManagementTableResponse(RiskManagementTableBase):
    """Schema for risk management table response"""
    id: int
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    columns: List[RiskTableColumnResponse] = []
    rows: List[RiskTableRowResponse] = []

    class Config:
        from_attributes = True


class RiskTableDataBulkUpdate(BaseModel):
    """Schema for bulk updating table data (rows and columns)"""
    sheet_name: Optional[str] = None
    sheet_icon: Optional[str] = None
    columns: List[RiskTableColumnCreate] = []
    rows: List[RiskTableRowCreate] = []
