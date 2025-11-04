"""
Risk analyses router
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..models.project import Project, ProjectMember, ProjectRole
from ..models.risk_analysis import RiskAnalysis, RiskFactor, RiskManagementTable, RiskTableRow, RiskTableColumn
from ..schemas.risk_analysis import (
    RiskAnalysisCreate, RiskAnalysisUpdate, RiskAnalysisResponse, RiskAnalysisSummary,
    RiskFactorCreate, RiskFactorUpdate, RiskFactorResponse
)
from ..routers.auth import get_current_active_user
from ..routers.projects import get_project, check_project_access
from ..core.logging import log_risk_created, log_risk_updated, log_risk_deleted

router = APIRouter()


async def sync_risk_to_table(db: Session, risk_factor: RiskFactor, project_id: int):
    """
    Sync a single risk factor to the risk management table.
    Creates or updates a row in the appropriate sheet based on lifecycle_stage.
    """
    # Get project lifecycle stages and create tables dynamically
    project = db.query(Project).filter(Project.id == project_id).first()
    lifecycle_stages = []

    if project.lifecycle_stages:
        if isinstance(project.lifecycle_stages, str):
            import json
            lifecycle_stages = json.loads(project.lifecycle_stages)
        else:
            lifecycle_stages = project.lifecycle_stages

    if project.custom_lifecycle_stages:
        if isinstance(project.custom_lifecycle_stages, str):
            import json
            custom_stages = json.loads(project.custom_lifecycle_stages)
            lifecycle_stages.extend(custom_stages)
        else:
            lifecycle_stages.extend(project.custom_lifecycle_stages)

    # Use lifecycle_stage directly as sheet_id if it's in the project stages
    sheet_id = risk_factor.lifecycle_stage if risk_factor.lifecycle_stage in lifecycle_stages else risk_factor.lifecycle_stage

    # Get or create table for this sheet
    table = db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project_id,
        RiskManagementTable.sheet_id == sheet_id
    ).first()

    if not table:
        # Create table if doesn't exist - use lifecycle stage name as table name
        table = RiskManagementTable(
            project_id=project_id,
            sheet_id=sheet_id,
            name=f"Управление рисками - {sheet_id}"
        )
        db.add(table)
        db.flush()

        # Create columns for this sheet (full set like in risk_tables.py)
        columns_def = [
            {"key": "risk_id", "label": "ID риска", "width": "100px", "index": 0},
            {"key": "lifecycle_stage", "label": "Этап жизненного цикла", "width": "180px", "index": 1},
            {"key": "hazard_name", "label": "Наименование опасности", "width": "200px", "index": 2},
            {"key": "event_sequence", "label": "Последовательность событий", "width": "200px", "index": 3},
            {"key": "hazardous_situation", "label": "Опасная ситуация", "width": "200px", "index": 4},
            {"key": "harm", "label": "Вред", "width": "150px", "index": 5},
            {"key": "severity_score", "label": "Тяжесть вреда, балл", "width": "120px", "index": 6},
            {"key": "probability_score", "label": "Вероятность причинения вреда, балл", "width": "150px", "index": 7},
            {"key": "risk_score", "label": "Риск, балл", "width": "100px", "index": 8},
            {"key": "risk_level_1", "label": "Уровень риска (доп./не доп.)", "width": "150px", "index": 9},
            {"key": "control_measure_1", "label": "Безопасность, заложенная в конструкции", "width": "200px", "index": 10},
            {"key": "control_measure_2", "label": "Защитная мера/средство", "width": "180px", "index": 11},
            {"key": "control_measure_3", "label": "Информация по безопасности/обучение", "width": "200px", "index": 12},
            {"key": "verification_1", "label": "Безопасность, заложенная в конструкции", "width": "200px", "index": 13},
            {"key": "verification_2", "label": "Защитная мера/средство", "width": "180px", "index": 14},
            {"key": "verification_3", "label": "Информация по безопасности", "width": "180px", "index": 15},
            {"key": "residual_risk_level", "label": "Тяжесть вреда, балл", "width": "130px", "index": 16},
            {"key": "residual_probability", "label": "Вероятность причинения вреда, балл", "width": "150px", "index": 17},
            {"key": "residual_risk_score", "label": "Достигнутый риск и его уровень", "width": "180px", "index": 18},
            {"key": "risk_level_2", "label": "Уровень риска (доп./не доп.)", "width": "150px", "index": 19},
            {"key": "risk_benefit_analysis", "label": "Анализ остаточный риск/польза", "width": "200px", "index": 20},
            {"key": "new_risks", "label": "Новые риски в результате принятия мер по управлению", "width": "250px", "index": 21}
        ]

        for col_def in columns_def:
            column = RiskTableColumn(
                table_id=table.id,
                key=col_def["key"],
                label=col_def["label"],
                width=col_def["width"],
                column_index=col_def["index"]
            )
            db.add(column)

    # Check if this risk already exists in the table
    # For SQLite, we need to search through all rows manually
    existing_row = None
    all_rows = db.query(RiskTableRow).filter(RiskTableRow.table_id == table.id).all()
    for row in all_rows:
        if row.data.get("risk_id") == str(risk_factor.id):
            existing_row = row
            break

    # Prepare row data (full set like in risk_tables.py)
    row_data = {
        "risk_id": str(risk_factor.id),
        "lifecycle_stage": risk_factor.lifecycle_stage or "",
        "hazard_name": risk_factor.hazard_name or "",
        "event_sequence": risk_factor.sequence_of_events or "",
        "hazardous_situation": risk_factor.hazardous_situation or "",
        "harm": risk_factor.harm or "",
        "severity_score": str(risk_factor.severity_score) if risk_factor.severity_score is not None else "",
        "probability_score": str(risk_factor.probability_score) if risk_factor.probability_score is not None else "",
        "risk_score": str(risk_factor.risk_score) if risk_factor.risk_score is not None else "",
        "risk_level_1": "",
        "control_measure_1": "",
        "control_measure_2": "",
        "control_measure_3": "",
        "verification_1": "",
        "verification_2": "",
        "verification_3": "",
        "residual_risk_level": "",
        "residual_probability": "",
        "residual_risk_score": "",
        "risk_level_2": "",
        "risk_benefit_analysis": "",
        "new_risks": ""
    }

    if existing_row:
        # Update existing row
        existing_row.data = row_data
    else:
        # Create new row
        row_count = db.query(RiskTableRow).filter(
            RiskTableRow.table_id == table.id
        ).count()

        new_row = RiskTableRow(
            table_id=table.id,
            row_number=row_count + 1,
            row_index=row_count,
            data=row_data
        )
        db.add(new_row)

    db.commit()


def get_risk_analysis(db: Session, analysis_id: int) -> RiskAnalysis:
    """Get risk analysis by ID"""
    return db.query(RiskAnalysis).filter(RiskAnalysis.id == analysis_id).first()


def calculate_risk_score(severity: int, probability: int) -> int:
    """Calculate risk score from severity and probability"""
    return severity * probability


def calculate_analysis_statistics(risk_factors: List[RiskFactor]) -> dict:
    """Calculate statistics for risk analysis"""
    total_factors = len(risk_factors)
    high_risk = sum(1 for factor in risk_factors if factor.risk_score is not None and factor.risk_score >= 15)
    medium_risk = sum(1 for factor in risk_factors if factor.risk_score is not None and 10 <= factor.risk_score < 15)
    low_risk = sum(1 for factor in risk_factors if factor.risk_score is not None and factor.risk_score < 10)
    not_evaluated = sum(1 for factor in risk_factors if factor.risk_score is None)
    
    return {
        "total_risk_factors": total_factors,
        "high_risk_count": high_risk,
        "medium_risk_count": medium_risk,
        "low_risk_count": low_risk,
        "not_evaluated_count": not_evaluated
    }


def check_risk_edit_permission(project: Project, user: User, db: Session):
    """Check if user can edit risks in this project"""
    # System administrator can edit any project risks
    if user.role == UserRole.SYS_ADMIN:
        return True
    
    # Project owner can edit risks
    if project.owner_id == user.id:
        return True
    
    # Check if user is a project member with manager role (can edit risks)
    # Doctor can only view and edit risk table, but cannot add/edit/delete risks
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == user.id
    ).first()
    
    if member and member.role == ProjectRole.MANAGER:
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
        # Risk score is optional now, calculated only if both severity and probability are provided
        risk_score = None
        if factor_data.severity_score is not None and factor_data.probability_score is not None:
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
    
    # Log risk analysis creation
    analysis_data = {
        "has_body_contact": db_analysis.has_body_contact,
        "contact_type": db_analysis.contact_type.value if db_analysis.contact_type else None,
        "analyst_id": db_analysis.analyst_id,
        "risk_factors_count": len(db_analysis.risk_factors)
    }
    
    await log_risk_created(
        db=db,
        user=current_user,
        project_id=project_id,
        project_name=db_project.name,
        risk_id=db_analysis.id,
        risk_description=f"Анализ рисков для проекта {db_project.name}",
        risk_data=analysis_data
    )
    
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
    
    # Risk score is optional now, calculated only if both severity and probability are provided
    risk_score = None
    if factor.severity_score is not None and factor.probability_score is not None:
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
        "lifecycle_stage": db_factor.lifecycle_stage,
        "hazard_category": db_factor.hazard_category.value if db_factor.hazard_category else None,
        "severity_score": db_factor.severity_score,
        "probability_score": db_factor.probability_score,
        "risk_score": db_factor.risk_score
    }
    
    await log_risk_created(
        db=db,
        user=current_user,
        project_id=db_analysis.project_id,
        project_name=db_analysis.project.name,
        risk_id=db_factor.id,
        risk_description=db_factor.hazard_name,
        risk_data=risk_data,
        request=request
    )
    
    # Auto-sync risk to risk management table
    await sync_risk_to_table(db, db_factor, db_analysis.project_id)
    
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
        "lifecycle_stage": db_factor.lifecycle_stage,
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
        if db_factor.severity_score is not None and db_factor.probability_score is not None:
            db_factor.risk_score = calculate_risk_score(db_factor.severity_score, db_factor.probability_score)
    
    db.commit()
    db.refresh(db_factor)
    
    # Sync updated risk to risk management table
    await sync_risk_to_table(db, db_factor, db_factor.analysis.project_id)
    
    # Store new values for logging
    new_values = {
        "hazard_name": db_factor.hazard_name,
        "hazardous_situation": db_factor.hazardous_situation,
        "harm": db_factor.harm,
        "lifecycle_stage": db_factor.lifecycle_stage,
        "hazard_category": db_factor.hazard_category.value if db_factor.hazard_category else None,
        "severity_score": db_factor.severity_score,
        "probability_score": db_factor.probability_score,
        "risk_score": db_factor.risk_score
    }
    
    # Log risk update
    await log_risk_updated(
        db=db,
        user=current_user,
        project_id=db_factor.analysis.project_id,
        project_name=db_factor.analysis.project.name,
        risk_id=db_factor.id,
        risk_description=db_factor.hazard_name,
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
        "lifecycle_stage": db_factor.lifecycle_stage,
        "hazard_category": db_factor.hazard_category.value if db_factor.hazard_category else None,
        "severity_score": db_factor.severity_score,
        "probability_score": db_factor.probability_score,
        "risk_score": db_factor.risk_score
    }
    
    project_id = db_factor.analysis.project_id
    project_name = db_factor.analysis.project.name
    risk_name = db_factor.hazard_name
    
    # Delete from risk management table
    # Get project lifecycle stages
    project = db.query(Project).filter(Project.id == project_id).first()
    lifecycle_stages = []

    if project.lifecycle_stages:
        if isinstance(project.lifecycle_stages, str):
            import json
            lifecycle_stages = json.loads(project.lifecycle_stages)
        else:
            lifecycle_stages = project.lifecycle_stages

    if project.custom_lifecycle_stages:
        if isinstance(project.custom_lifecycle_stages, str):
            import json
            custom_stages = json.loads(project.custom_lifecycle_stages)
            lifecycle_stages.extend(custom_stages)
        else:
            lifecycle_stages.extend(project.custom_lifecycle_stages)

    sheet_id = db_factor.lifecycle_stage if db_factor.lifecycle_stage in lifecycle_stages else db_factor.lifecycle_stage
    table = db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project_id,
        RiskManagementTable.sheet_id == sheet_id
    ).first()
    
    if table:
        # Find and delete the row with this risk_id (SQLite compatible)
        all_rows = db.query(RiskTableRow).filter(RiskTableRow.table_id == table.id).order_by(RiskTableRow.row_index).all()
        deleted_row = None
        for row in all_rows:
            if row.data.get("risk_id") == str(factor_id):
                deleted_row = row
                db.delete(row)
                break
        
        # Reindex remaining rows if a row was deleted
        if deleted_row:
            db.flush()  # Ensure deletion is processed
            remaining_rows = db.query(RiskTableRow).filter(
                RiskTableRow.table_id == table.id
            ).order_by(RiskTableRow.row_index).all()
            
            # Update row numbers and indices
            for idx, row in enumerate(remaining_rows):
                row.row_number = idx + 1
                row.row_index = idx
    
    db.delete(db_factor)
    db.commit()
    
    # Log risk deletion
    await log_risk_deleted(
        db=db,
        user=current_user,
        project_id=project_id,
        project_name=project_name,
        risk_id=factor_id,
        risk_description=risk_name,
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
