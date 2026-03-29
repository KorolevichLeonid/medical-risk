"""
Risk analyses router
"""
from typing import List
import json
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


def _decode_assigned_lifecycle_stages(raw_value) -> List[str]:
    if not raw_value:
        return []
    if isinstance(raw_value, list):
        return [str(stage).strip() for stage in raw_value if str(stage).strip()]
    if isinstance(raw_value, str):
        value = raw_value.strip()
        if not value:
            return []
        if value.startswith("["):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(stage).strip() for stage in parsed if str(stage).strip()]
            except json.JSONDecodeError:
                pass
        return [value]
    return []


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
            {"key": "hazard_category", "label": "Категория опасности", "width": "220px", "index": 1},
            {"key": "hazard_name", "label": "Наименование опасности", "width": "200px", "index": 2},
            {"key": "event_sequence", "label": "Последовательность событий", "width": "200px", "index": 3},
            {"key": "hazardous_situation", "label": "Опасная ситуация", "width": "200px", "index": 4},
            {"key": "harm", "label": "Вред", "width": "150px", "index": 5},
            {"key": "severity_score", "label": "Тяжесть вреда, балл", "width": "120px", "index": 6},
            {"key": "probability_score", "label": "Вероятность причинения вреда, балл", "width": "150px", "index": 7},
            {"key": "risk_score", "label": "Риск, балл", "width": "100px", "index": 8},
            {"key": "risk_level_1", "label": "Уровень риска (доп./не доп.)", "width": "150px", "index": 9},
            {"key": "comment_1", "label": "Комментарий", "width": "200px", "index": 10},
            {"key": "control_measure_1", "label": "Безопасность, заложенная в конструкции", "width": "200px", "index": 11},
            {"key": "control_measure_2", "label": "Защитная мера/средство", "width": "180px", "index": 12},
            {"key": "control_measure_3", "label": "Информация по безопасности/обучение", "width": "200px", "index": 13},
            {"key": "verification_1", "label": "Безопасность, заложенная в конструкции", "width": "200px", "index": 14},
            {"key": "verification_2", "label": "Защитная мера/средство", "width": "180px", "index": 15},
            {"key": "verification_3", "label": "Информация по безопасности", "width": "180px", "index": 16},
            {"key": "residual_risk_level", "label": "Тяжесть вреда, балл", "width": "130px", "index": 17},
            {"key": "residual_probability", "label": "Вероятность причинения вреда, балл", "width": "150px", "index": 18},
            {"key": "residual_risk_score", "label": "Достигнутый риск и его уровень", "width": "180px", "index": 19},
            {"key": "risk_level_2", "label": "Уровень риска (доп./не доп.)", "width": "150px", "index": 20},
            {"key": "comment_2", "label": "Комментарий", "width": "200px", "index": 21},
            {"key": "risk_benefit_analysis", "label": "Анализ остаточный риск/польза", "width": "200px", "index": 22},
            {"key": "new_risks", "label": "Новые риски в результате принятия мер по управлению", "width": "250px", "index": 23}
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
    # Extract hazard category from hazard_name (format: "[Category] Name")
    hazard_category = ""
    clean_hazard_name = risk_factor.hazard_name or ""
    if risk_factor.hazard_name:
        import re
        category_match = re.match(r'^\[(.+?)\]\s*(.*)$', risk_factor.hazard_name)
        if category_match:
            hazard_category = category_match.group(1)
            clean_hazard_name = category_match.group(2)
    
    row_data = {
        "risk_id": str(risk_factor.id),
        "hazard_category": hazard_category,
        "hazard_name": clean_hazard_name,
        "event_sequence": risk_factor.sequence_of_events or "",
        "hazardous_situation": risk_factor.hazardous_situation or "",
        "harm": risk_factor.harm or "",
        "severity_score": str(risk_factor.severity_score) if risk_factor.severity_score is not None else "",
        "probability_score": str(risk_factor.probability_score) if risk_factor.probability_score is not None else "",
        "risk_score": str(risk_factor.risk_score) if risk_factor.risk_score is not None else "",
        "risk_level_1": "",
        "comment_1": "",
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
        "comment_2": "",
        "risk_benefit_analysis": "",
        "new_risks": "",
        "risk_status": "new"  # Default status for new risks
    }

    if existing_row:
        # Update existing row but preserve risk_status and evaluation data
        existing_risk_status = existing_row.data.get('risk_status', 'new')
        existing_first_eval = existing_row.data.get('first_evaluation_done', False)
        existing_second_eval = existing_row.data.get('second_evaluation_done', False)
        existing_locked_after_second = existing_row.data.get('locked_after_second', False)
        existing_is_closed = existing_row.data.get('is_closed', False)
        
        # Preserve control measures and evaluation data
        existing_control_1 = existing_row.data.get('control_measure_1', '')
        existing_control_2 = existing_row.data.get('control_measure_2', '')
        existing_control_3 = existing_row.data.get('control_measure_3', '')
        existing_verification_1 = existing_row.data.get('verification_1', '')
        existing_verification_2 = existing_row.data.get('verification_2', '')
        existing_verification_3 = existing_row.data.get('verification_3', '')
        existing_risk_level_1 = existing_row.data.get('risk_level_1', '')
        existing_comment_1 = existing_row.data.get('comment_1', '')
        existing_residual_risk_level = existing_row.data.get('residual_risk_level', '')
        existing_residual_probability = existing_row.data.get('residual_probability', '')
        existing_residual_risk_score = existing_row.data.get('residual_risk_score', '')
        existing_risk_level_2 = existing_row.data.get('risk_level_2', '')
        existing_comment_2 = existing_row.data.get('comment_2', '')
        existing_risk_benefit = existing_row.data.get('risk_benefit_analysis', '')
        existing_new_risks = existing_row.data.get('new_risks', '')
        
        # Update row with new base data
        existing_row.data = row_data
        
        # Restore preserved fields
        existing_row.data['risk_status'] = existing_risk_status
        existing_row.data['first_evaluation_done'] = existing_first_eval
        existing_row.data['second_evaluation_done'] = existing_second_eval
        existing_row.data['locked_after_second'] = existing_locked_after_second
        existing_row.data['is_closed'] = existing_is_closed
        existing_row.data['control_measure_1'] = existing_control_1
        existing_row.data['control_measure_2'] = existing_control_2
        existing_row.data['control_measure_3'] = existing_control_3
        existing_row.data['verification_1'] = existing_verification_1
        existing_row.data['verification_2'] = existing_verification_2
        existing_row.data['verification_3'] = existing_verification_3
        existing_row.data['risk_level_1'] = existing_risk_level_1
        existing_row.data['comment_1'] = existing_comment_1
        existing_row.data['residual_risk_level'] = existing_residual_risk_level
        existing_row.data['residual_probability'] = existing_residual_probability
        existing_row.data['residual_risk_score'] = existing_residual_risk_score
        existing_row.data['risk_level_2'] = existing_risk_level_2
        existing_row.data['comment_2'] = existing_comment_2
        existing_row.data['risk_benefit_analysis'] = existing_risk_benefit
        existing_row.data['new_risks'] = existing_new_risks
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


def check_user_permission(user: User, permission_key: str, project_id: int = None, db: Session = None):
    """Check if user has a specific permission"""
    # System admin has all permissions
    if user.role == UserRole.SYS_ADMIN:
        return True

    if not db or not project_id:
        return False

    # Get user's role in the project
    project_role = None
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        return False

    # Check if user is project owner (always admin)
    if project.owner_id == user.id:
        project_role = "admin"
    else:
        # Check if user is a project member
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id
        ).first()

        if member:
            project_role = member.role.value

    # Get permissions for the role
    if project_role:
        if project_role == "admin" and permission_key in {
            "create_risks",
            "edit_risks",
            "assess_severity",
            "assess_probability",
        }:
            return False

        from ..models.project import RolePermission
        role_permissions = db.query(RolePermission).filter(
            RolePermission.role_name == project_role
        ).all()
        permission_keys = [rp.permission_key for rp in role_permissions]
        return permission_key in permission_keys

    return False


def check_risk_edit_permission(project: Project, user: User, db: Session):
    """Check if user can edit risks in this project"""
    return check_user_permission(user, "edit_risks", project.id, db)


def get_specialist_lifecycle_stage(user: User, project_id: int, db: Session):
    """Get lifecycle stages assigned to specialist, or None for non-specialist."""
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id,
        ProjectMember.role == ProjectRole.SPECIALIST
    ).first()
    if member:
        return _decode_assigned_lifecycle_stages(member.assigned_lifecycle_stage)
    return None


def check_specialist_lifecycle_access(user: User, project_id: int, lifecycle_stage: str, db: Session):
    """Check if a specialist has access to a specific lifecycle stage. Non-specialists always have access."""
    if user.role == UserRole.SYS_ADMIN:
        return True
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id
    ).first()
    if not member:
        # Could be project owner
        project = db.query(Project).filter(Project.id == project_id).first()
        if project and project.owner_id == user.id:
            return True
        return False
    if member.role != ProjectRole.SPECIALIST:
        return True  # Non-specialists have access to all stages
    # Specialist can only access assigned lifecycle stages
    return lifecycle_stage in _decode_assigned_lifecycle_stages(member.assigned_lifecycle_stage)


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

    if not check_risk_edit_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit risks in this project"
        )
    
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
    if not check_risk_edit_permission(db_analysis.project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit risks in this project"
        )
    
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
    if not check_risk_edit_permission(db_analysis.project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit risks in this project"
        )
    
    # Specialist can only create risks in their assigned lifecycle stage
    if factor.lifecycle_stage and not check_specialist_lifecycle_access(
        current_user, db_analysis.project_id, factor.lifecycle_stage, db
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Specialists can only create risks in their assigned lifecycle stage"
        )
    
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
    if not check_risk_edit_permission(db_factor.analysis.project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit risks in this project"
        )
    
    # Specialist can only edit risks in their assigned lifecycle stage
    if db_factor.lifecycle_stage and not check_specialist_lifecycle_access(
        current_user, db_factor.analysis.project_id, db_factor.lifecycle_stage, db
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Specialists can only edit risks in their assigned lifecycle stage"
        )
    
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
    if not check_risk_edit_permission(db_factor.analysis.project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit risks in this project"
        )
    
    # Specialist can only delete risks in their assigned lifecycle stage
    if db_factor.lifecycle_stage and not check_specialist_lifecycle_access(
        current_user, db_factor.analysis.project_id, db_factor.lifecycle_stage, db
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Specialists can only delete risks in their assigned lifecycle stage"
        )
    
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
    """Get all risk factors for a project with risk status from risk table"""
    from ..models.risk_analysis import RiskManagementTable, RiskTableRow
    
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
    
    # For specialist role: filter to only assigned lifecycle stages
    specialist_stages = get_specialist_lifecycle_stage(current_user, project_id, db)
    
    # Get risk status from risk tables for each risk factor
    risk_factors_with_status = []
    
    for factor in analysis.risk_factors:
        # If specialist, skip factors from unassigned lifecycle stages
        if specialist_stages is not None and factor.lifecycle_stage not in specialist_stages:
            continue
        factor_dict = {
            "id": factor.id,
            "analysis_id": factor.analysis_id,
            "lifecycle_stage": factor.lifecycle_stage,
            "hazard_name": factor.hazard_name,
            "hazardous_situation": factor.hazardous_situation,
            "sequence_of_events": factor.sequence_of_events,
            "harm": factor.harm,
            "hazard_category": factor.hazard_category,
            "severity_score": factor.severity_score,
            "probability_score": factor.probability_score,
            "risk_score": factor.risk_score,
            "control_measures": factor.control_measures,
            "created_at": factor.created_at,
            "updated_at": factor.updated_at,
            "risk_status": "new"  # Default status
        }
        
        # Try to find risk status from risk table
        if factor.lifecycle_stage:
            table = db.query(RiskManagementTable).filter(
                RiskManagementTable.project_id == project_id,
                RiskManagementTable.sheet_id == factor.lifecycle_stage
            ).first()
            
            if table and table.rows:
                # Search by risk_id (stored as string in row.data) - most reliable
                factor_id_str = str(factor.id)
                matched_row = None
                
                for row in table.rows:
                    row_data = row.data or {}
                    row_risk_id = row_data.get('risk_id', '')
                    
                    # Primary match: by risk_id (most reliable method)
                    if row_risk_id == factor_id_str:
                        matched_row = row
                        break
                    
                    # Fallback match: by hazard details (for old rows without risk_id)
                    if not matched_row:
                        # Extract clean hazard name (remove category prefix if exists)
                        clean_factor_name = factor.hazard_name
                        if factor.hazard_name and '[' in factor.hazard_name:
                            parts = factor.hazard_name.split(']', 1)
                            if len(parts) > 1:
                                clean_factor_name = parts[1].strip()
                        
                        row_hazard_name = row_data.get('hazard_name', '')
                        row_situation = row_data.get('hazardous_situation', '')
                        row_harm = row_data.get('harm', '')
                        
                        # Match by hazard details
                        if (row_situation == factor.hazardous_situation and
                            row_harm == factor.harm and
                            (row_hazard_name == clean_factor_name or row_hazard_name == factor.hazard_name)):
                            matched_row = row
                
                if matched_row:
                    matched_data = matched_row.data or {}
                    factor_dict["risk_status"] = matched_data.get('risk_status', 'new')
                    # Return residual risk score from the table if present
                    raw_residual = matched_data.get('residual_risk_score', '')
                    if raw_residual not in (None, ''):
                        try:
                            factor_dict["residual_risk_score"] = int(float(str(raw_residual)))
                        except (ValueError, TypeError):
                            pass
        
        risk_factors_with_status.append(factor_dict)
    
    return risk_factors_with_status


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
