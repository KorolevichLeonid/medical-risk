"""
Risk analyses router
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..models.project import Project, ProjectMember, ProjectRole
from ..models.risk_analysis import RiskAnalysis, RiskFactor
from ..schemas.risk_analysis import (
    RiskAnalysisCreate, RiskAnalysisUpdate, RiskAnalysisResponse, RiskAnalysisSummary,
    RiskFactorCreate, RiskFactorUpdate, RiskFactorResponse
)
from ..routers.auth import get_current_active_user
from ..routers.projects import get_project, check_project_access
from ..core.logging import log_risk_created, log_risk_updated, log_risk_deleted

router = APIRouter()


def get_risk_analysis(db: Session, analysis_id: int) -> RiskAnalysis:
    """Get risk analysis by ID"""
    return db.query(RiskAnalysis).filter(RiskAnalysis.id == analysis_id).first()


def calculate_risk_score(severity: int, probability: int) -> int:
    """Calculate risk score from severity and probability"""
    return severity * probability


def calculate_analysis_statistics(risk_factors: List[RiskFactor]) -> dict:
    """Calculate statistics for risk analysis"""
    total_factors = len(risk_factors)
    high_risk = sum(1 for factor in risk_factors if factor.risk_score >= 15)
    medium_risk = sum(1 for factor in risk_factors if 10 <= factor.risk_score < 15)
    low_risk = sum(1 for factor in risk_factors if factor.risk_score < 10)
    
    return {
        "total_risk_factors": total_factors,
        "high_risk_count": high_risk,
        "medium_risk_count": medium_risk,
        "low_risk_count": low_risk
    }


def check_risk_edit_permission(project: Project, user: User, db: Session):
    """Check if user can edit risks in this project"""
    # System administrator can edit any project risks
    if user.role == UserRole.SYS_ADMIN:
        return True
    
    # Project owner can edit risks
    if project.owner_id == user.id:
        return True
    
    # Check if user is a project member with doctor role (can edit risks)
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == user.id
    ).first()
    
    if member and member.role == ProjectRole.DOCTOR:
        return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not enough permissions to edit risks in this project"
    )


@router.get("/project/{project_id}", response_model=RiskAnalysisResponse)
async def get_project_risk_analysis(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get risk analysis for a project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_project_access(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this project"
        )
    
    # Get the latest risk analysis for this project
    analysis = db.query(RiskAnalysis).filter(
        RiskAnalysis.project_id == project_id
    ).order_by(RiskAnalysis.created_at.desc()).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Risk analysis not found")
    
    # Calculate statistics
    stats = calculate_analysis_statistics(analysis.risk_factors)
    
    # Create response with statistics
    response_data = RiskAnalysisResponse.from_orm(analysis)
    response_data.total_risk_factors = stats["total_risk_factors"]
    response_data.high_risk_count = stats["high_risk_count"]
    response_data.medium_risk_count = stats["medium_risk_count"]
    response_data.low_risk_count = stats["low_risk_count"]
    
    return response_data


@router.post("/project/{project_id}", response_model=RiskAnalysisResponse)
async def create_risk_analysis(
    project_id: int,
    analysis: RiskAnalysisCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new risk analysis for a project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    check_risk_edit_permission(db_project, current_user, db)
    
    # Create risk analysis
    db_analysis = RiskAnalysis(
        project_id=project_id,
        has_body_contact=analysis.has_body_contact,
        contact_type=analysis.contact_type,
        analyst_id=current_user.id
    )
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)
    
    # Create risk factors
    for factor_data in analysis.risk_factors:
        risk_score = calculate_risk_score(factor_data.severity_score, factor_data.probability_score)
        
        db_factor = RiskFactor(
            analysis_id=db_analysis.id,
            lifecycle_stage=factor_data.lifecycle_stage,
            hazard_name=factor_data.hazard_name,
            hazardous_situation=factor_data.hazardous_situation,
            sequence_of_events=factor_data.sequence_of_events,
            harm=factor_data.harm,
            hazard_category=factor_data.hazard_category,
            severity_score=factor_data.severity_score,
            probability_score=factor_data.probability_score,
            risk_score=risk_score,
            control_measures=factor_data.control_measures
        )
        db.add(db_factor)
    
    db.commit()
    db.refresh(db_analysis)
    
    # Calculate statistics
    stats = calculate_analysis_statistics(db_analysis.risk_factors)
    
    # Update project progress (simple calculation based on having analysis)
    db_project.progress_percentage = min(50.0, db_project.progress_percentage + 25.0)
    db.commit()
    
    # Create response with statistics
    response_data = RiskAnalysisResponse.from_orm(db_analysis)
    response_data.total_risk_factors = stats["total_risk_factors"]
    response_data.high_risk_count = stats["high_risk_count"]
    response_data.medium_risk_count = stats["medium_risk_count"]
    response_data.low_risk_count = stats["low_risk_count"]
    
    return response_data


@router.put("/{analysis_id}", response_model=RiskAnalysisResponse)
async def update_risk_analysis(
    analysis_id: int,
    analysis_update: RiskAnalysisUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update risk analysis"""
    db_analysis = get_risk_analysis(db, analysis_id=analysis_id)
    if db_analysis is None:
        raise HTTPException(status_code=404, detail="Risk analysis not found")
    
    # Check risk edit permission
    check_risk_edit_permission(db_analysis.project, current_user, db)
    
    # Update fields if provided
    update_data = analysis_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_analysis, field, value)
    
    db.commit()
    db.refresh(db_analysis)
    
    # Calculate statistics
    stats = calculate_analysis_statistics(db_analysis.risk_factors)
    
    # Create response with statistics
    response_data = RiskAnalysisResponse.from_orm(db_analysis)
    response_data.total_risk_factors = stats["total_risk_factors"]
    response_data.high_risk_count = stats["high_risk_count"]
    response_data.medium_risk_count = stats["medium_risk_count"]
    response_data.low_risk_count = stats["low_risk_count"]
    
    return response_data


@router.post("/{analysis_id}/factors", response_model=RiskFactorResponse)
async def add_risk_factor(
    analysis_id: int,
    factor: RiskFactorCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a risk factor to an analysis"""
    db_analysis = get_risk_analysis(db, analysis_id=analysis_id)
    if db_analysis is None:
        raise HTTPException(status_code=404, detail="Risk analysis not found")
    
    # Check risk edit permission
    check_risk_edit_permission(db_analysis.project, current_user, db)
    
    risk_score = calculate_risk_score(factor.severity_score, factor.probability_score)
    
    db_factor = RiskFactor(
        analysis_id=analysis_id,
        lifecycle_stage=factor.lifecycle_stage,
        hazard_name=factor.hazard_name,
        hazardous_situation=factor.hazardous_situation,
        sequence_of_events=factor.sequence_of_events,
        harm=factor.harm,
        hazard_category=factor.hazard_category,
        severity_score=factor.severity_score,
        probability_score=factor.probability_score,
        risk_score=risk_score,
        control_measures=factor.control_measures
    )
    db.add(db_factor)
    db.commit()
    db.refresh(db_factor)
    
    # Log risk creation
    risk_data = {
        "hazard_name": db_factor.hazard_name,
        "hazardous_situation": db_factor.hazardous_situation,
        "harm": db_factor.harm,
        "lifecycle_stage": db_factor.lifecycle_stage.value if db_factor.lifecycle_stage else None,
        "hazard_category": db_factor.hazard_category.value if db_factor.hazard_category else None,
        "severity_score": db_factor.severity_score,
        "probability_score": db_factor.probability_score,
        "risk_score": db_factor.risk_score
    }
    
    log_risk_created(
        db=db,
        user=current_user,
        project_id=db_analysis.project_id,
        project_name=db_analysis.project.name,
        risk_id=db_factor.id,
        risk_name=db_factor.hazard_name,
        risk_data=risk_data,
        request=request
    )
    
    return db_factor


@router.put("/factors/{factor_id}", response_model=RiskFactorResponse)
async def update_risk_factor(
    factor_id: int,
    factor_update: RiskFactorUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a risk factor"""
    db_factor = db.query(RiskFactor).filter(RiskFactor.id == factor_id).first()
    if db_factor is None:
        raise HTTPException(status_code=404, detail="Risk factor not found")
    
    # Check risk edit permission
    check_risk_edit_permission(db_factor.analysis.project, current_user, db)
    
    # Store old values for logging
    old_values = {
        "hazard_name": db_factor.hazard_name,
        "hazardous_situation": db_factor.hazardous_situation,
        "harm": db_factor.harm,
        "lifecycle_stage": db_factor.lifecycle_stage.value if db_factor.lifecycle_stage else None,
        "hazard_category": db_factor.hazard_category.value if db_factor.hazard_category else None,
        "severity_score": db_factor.severity_score,
        "probability_score": db_factor.probability_score,
        "risk_score": db_factor.risk_score
    }
    
    # Update fields if provided
    update_data = factor_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_factor, field, value)
    
    # Recalculate risk score if severity or probability changed
    if "severity_score" in update_data or "probability_score" in update_data:
        db_factor.risk_score = calculate_risk_score(db_factor.severity_score, db_factor.probability_score)
    
    db.commit()
    db.refresh(db_factor)
    
    # Store new values for logging
    new_values = {
        "hazard_name": db_factor.hazard_name,
        "hazardous_situation": db_factor.hazardous_situation,
        "harm": db_factor.harm,
        "lifecycle_stage": db_factor.lifecycle_stage.value if db_factor.lifecycle_stage else None,
        "hazard_category": db_factor.hazard_category.value if db_factor.hazard_category else None,
        "severity_score": db_factor.severity_score,
        "probability_score": db_factor.probability_score,
        "risk_score": db_factor.risk_score
    }
    
    # Log risk update
    log_risk_updated(
        db=db,
        user=current_user,
        project_id=db_factor.analysis.project_id,
        project_name=db_factor.analysis.project.name,
        risk_id=db_factor.id,
        risk_name=db_factor.hazard_name,
        old_data=old_values,
        new_data=new_values,
        request=request
    )
    
    return db_factor


@router.delete("/factors/{factor_id}")
async def delete_risk_factor(
    factor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a risk factor"""
    db_factor = db.query(RiskFactor).filter(RiskFactor.id == factor_id).first()
    if db_factor is None:
        raise HTTPException(status_code=404, detail="Risk factor not found")
    
    # Check risk edit permission
    check_risk_edit_permission(db_factor.analysis.project, current_user, db)
    
    # Store data for logging before deletion
    risk_data = {
        "hazard_name": db_factor.hazard_name,
        "hazardous_situation": db_factor.hazardous_situation,
        "harm": db_factor.harm,
        "lifecycle_stage": db_factor.lifecycle_stage.value if db_factor.lifecycle_stage else None,
        "hazard_category": db_factor.hazard_category.value if db_factor.hazard_category else None,
        "severity_score": db_factor.severity_score,
        "probability_score": db_factor.probability_score,
        "risk_score": db_factor.risk_score
    }
    
    project_id = db_factor.analysis.project_id
    project_name = db_factor.analysis.project.name
    risk_name = db_factor.hazard_name
    
    db.delete(db_factor)
    db.commit()
    
    # Log risk deletion
    log_risk_deleted(
        db=db,
        user=current_user,
        project_id=project_id,
        project_name=project_name,
        risk_id=factor_id,
        risk_name=risk_name,
        risk_data=risk_data,
        request=request
    )
    
    return {"message": "Risk factor deleted successfully"}


@router.get("/project/{project_id}/factors", response_model=List[RiskFactorResponse])
async def get_project_risk_factors(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all risk factors for a project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_project_access(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this project"
        )
    
    # Get the latest risk analysis for this project
    analysis = db.query(RiskAnalysis).filter(
        RiskAnalysis.project_id == project_id
    ).order_by(RiskAnalysis.created_at.desc()).first()
    
    if not analysis:
        return []
    
    return analysis.risk_factors


@router.get("/summary", response_model=List[RiskAnalysisSummary])
async def get_risk_analysis_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get summary of all risk analyses accessible to the user"""
    if current_user.role == UserRole.SYS_ADMIN:
        # Sys admin can see all analyses
        analyses = db.query(RiskAnalysis).join(Project).all()
    else:
        # Users can see analyses for projects they have access to
        analyses = db.query(RiskAnalysis).join(Project).filter(
            (Project.owner_id == current_user.id) | 
            (Project.members.any(user_id=current_user.id))
        ).all()
    
    summaries = []
    for analysis in analyses:
        stats = calculate_analysis_statistics(analysis.risk_factors)
        summary = RiskAnalysisSummary(
            project_id=analysis.project_id,
            project_name=analysis.project.name,
            device_name=analysis.project.device_name,
            total_risk_factors=stats["total_risk_factors"],
            high_risk_count=stats["high_risk_count"],
            medium_risk_count=stats["medium_risk_count"],
            low_risk_count=stats["low_risk_count"],
            analysis_date=analysis.analysis_date,
            analyst_name=f"{analysis.analyst.first_name} {analysis.analyst.last_name}"
        )
        summaries.append(summary)
    
    return summaries
