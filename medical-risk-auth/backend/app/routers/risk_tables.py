"""
Risk management table API router
"""
import logging
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.project import Project, ProjectMember, ProjectRole
from ..models.risk_analysis import (
    RiskManagementTable, RiskTableRow, RiskTableColumn, RiskFactor, RiskAnalysis, HazardCategory, LifecycleStage
)
from ..schemas.risk_analysis import (
    RiskManagementTableResponse, RiskManagementTableCreate,
    RiskManagementTableUpdate, RiskTableDataBulkUpdate,
    RiskTableRowResponse, RiskTableColumnResponse, RiskTableRowUpdate
)
from ..routers.auth import get_current_active_user
from ..routers.projects import get_project, check_project_access

router = APIRouter()
logger = logging.getLogger(__name__)


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


def clean_orphaned_rows(db: Session, table: RiskManagementTable, project_id: int, sheet_id: str):
    """
    Remove rows from risk table that don't correspond to existing risk factors.
    Only applies to auto-managed sheets (lifecycle stages).
    """
    # Get project to check if this sheet_id is a lifecycle stage
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return

    # Get all lifecycle stages for this project
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

    # Only clean auto-managed sheets (lifecycle stages configured for the project)
    if sheet_id not in lifecycle_stages:
        return

    logger.info(f"Cleaning orphaned rows for project {project_id}, sheet {sheet_id}")

    # Get all risk factor IDs for this lifecycle stage in this project
    valid_risk_ids = set()
    risk_factors = db.query(RiskFactor).join(
        RiskAnalysis, RiskFactor.analysis_id == RiskAnalysis.id
    ).filter(
        RiskAnalysis.project_id == project_id,
        RiskFactor.lifecycle_stage == sheet_id
    ).all()

    for factor in risk_factors:
        valid_risk_ids.add(str(factor.id))

    logger.info(f"Valid risk IDs for {sheet_id}: {valid_risk_ids}")

    # Get all rows in the table
    all_rows = db.query(RiskTableRow).filter(
        RiskTableRow.table_id == table.id
    ).order_by(RiskTableRow.row_index).all()

    logger.info(f"Total rows in table: {len(all_rows)}")

    # Find and delete orphaned rows
    rows_to_delete = []
    for row in all_rows:
        risk_id = row.data.get("risk_id")
        if not risk_id or risk_id not in valid_risk_ids:
            rows_to_delete.append(row)
            logger.info(f"Marking row for deletion: risk_id={risk_id}")

    # Delete orphaned rows
    for row in rows_to_delete:
        db.delete(row)

    if rows_to_delete:
        logger.info(f"Deleting {len(rows_to_delete)} orphaned rows")
        db.flush()

        # Reindex remaining rows
        remaining_rows = db.query(RiskTableRow).filter(
            RiskTableRow.table_id == table.id
        ).order_by(RiskTableRow.row_index).all()

        logger.info(f"Reindexing {len(remaining_rows)} remaining rows")

        for idx, row in enumerate(remaining_rows):
            row.row_number = idx + 1
            row.row_index = idx

        db.commit()
        logger.info("Cleanup complete")
    else:
        logger.info("No orphaned rows found")


def get_risk_table(db: Session, table_id: int) -> RiskManagementTable:
    """Get risk management table by ID"""
    return db.query(RiskManagementTable).filter(RiskManagementTable.id == table_id).first()


def check_user_permission(user: User, permission_key: str, project_id: int = None, db: Session = None):
    """Check if user has a specific permission (union across all assigned roles)."""
    if hasattr(user, 'role') and str(user.role) in ("SYS_ADMIN", "UserRole.SYS_ADMIN"):
        return True

    if not db or not project_id:
        return False

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return False

    if project.owner_id == user.id:
        roles_to_check = ["admin"]
    else:
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id
        ).first()
        if not member:
            return False
        roles_to_check = member.get_roles()

    from ..models.project import RolePermission
    all_keys: set = set()
    for role_name in roles_to_check:
        rps = db.query(RolePermission).filter(RolePermission.role_name == role_name).all()
        all_keys.update(rp.permission_key for rp in rps)

    return permission_key in all_keys


def check_risk_table_edit_permission(project: Project, user: User, db: Session):
    """Check if user can edit risk tables in this project"""
    return check_user_permission(user, "edit_risk_tables", project.id, db)


def check_specialist_sheet_access(user: User, project_id: int, sheet_id: str, db: Session):
    """Check if user has access to a specific sheet/lifecycle stage.
    Doctors bypass the specialist restriction. Pure specialists are limited to assigned stages.
    """
    if hasattr(user, 'role') and str(user.role) in ('SYS_ADMIN', 'UserRole.SYS_ADMIN'):
        return True
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id
    ).first()
    if not member:
        project = db.query(Project).filter(Project.id == project_id).first()
        if project and project.owner_id == user.id:
            return True
        return False
    member_roles = member.get_roles()
    # Doctor can access all sheets
    if 'doctor' in member_roles:
        return True
    # Non-specialist hierarchical roles have access to all sheets
    if 'specialist' not in member_roles:
        return True
    # Pure specialist: restricted to assigned lifecycle stage sheets
    return sheet_id in _decode_assigned_lifecycle_stages(member.assigned_lifecycle_stage)


@router.get("/project/{project_id}/sheets/{sheet_id}", response_model=RiskManagementTableResponse)
async def get_project_sheet(
    project_id: int,
    sheet_id: str,
    db: Session = Depends(get_db)
    # Removed auth check for testing - use Optional[current_user] later if needed
):
    """Get risk management table for a specific sheet"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get the table for this project and sheet
    table = db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project_id,
        RiskManagementTable.sheet_id == sheet_id
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Risk management table not found")

    # Clean orphaned rows for auto-managed sheets (sheet1-4)
    clean_orphaned_rows(db, table, project_id, sheet_id)
    
    # Refresh table to get updated data
    db.refresh(table)

    return table


@router.put("/project/{project_id}/sheets/{sheet_id}", response_model=RiskManagementTableResponse)
async def create_or_update_table(
    project_id: int,
    sheet_id: str,
    table_data: RiskTableDataBulkUpdate,
    db: Session = Depends(get_db)
):
    """Create or update risk management table with bulk data"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    # Find existing table or create new one
    table = db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project_id,
        RiskManagementTable.sheet_id == sheet_id
    ).first()

    if not table:
        # Create new table
        table = RiskManagementTable(
            project_id=project_id,
            sheet_id=sheet_id,
            name=table_data.sheet_name,
            icon=table_data.sheet_icon
        )
        db.add(table)
        db.flush()  # Get table ID
    else:
        # Update existing table
        if table_data.sheet_name is not None:
            table.name = table_data.sheet_name
        if table_data.sheet_icon is not None:
            table.icon = table_data.sheet_icon

    # Delete existing columns and rows
    db.query(RiskTableColumn).filter(RiskTableColumn.table_id == table.id).delete()
    db.query(RiskTableRow).filter(RiskTableRow.table_id == table.id).delete()

    # Create new columns
    for col_data in table_data.columns:
        column = RiskTableColumn(
            table_id=table.id,
            key=col_data.key,
            label=col_data.label,
            width=col_data.width,
            column_index=col_data.column_index
        )
        db.add(column)

    # Create new rows
    for row_data in table_data.rows:
        row = RiskTableRow(
            table_id=table.id,
            row_number=row_data.row_number,
            row_index=row_data.row_index,
            data=row_data.data,
            cell_colors=row_data.cell_colors
        )
        db.add(row)

    db.commit()
    db.refresh(table)

    # Sync scores back to risk factors for lifecycle stages configured in the project
    lifecycle_stages = []
    if db_project.lifecycle_stages:
        if isinstance(db_project.lifecycle_stages, str):
            import json
            lifecycle_stages = json.loads(db_project.lifecycle_stages)
        else:
            lifecycle_stages = db_project.lifecycle_stages

    if db_project.custom_lifecycle_stages:
        if isinstance(db_project.custom_lifecycle_stages, str):
            import json
            custom_stages = json.loads(db_project.custom_lifecycle_stages)
            lifecycle_stages.extend(custom_stages)
        else:
            lifecycle_stages.extend(db_project.custom_lifecycle_stages)

    if sheet_id in lifecycle_stages:
        await sync_table_to_risks(db, table, project_id)

    return table


async def sync_table_to_risks(db: Session, table: RiskManagementTable, project_id: int):
    """
    Sync risk scores from table back to risk_factors.
    Updates severity_score, probability_score, and risk_score in risk_factors table.
    """
    from ..models.risk_analysis import RiskFactor

    logger.info(f"Starting risk table sync for project {project_id}, table {table.id}")

    # Get all rows from this table
    rows = db.query(RiskTableRow).filter(
        RiskTableRow.table_id == table.id
    ).all()

    logger.info(f"Found {len(rows)} rows to process")

    updated_count = 0

    def safe_int_convert(value):
        """Safely convert string to int, handling various formats"""
        if value is None:
            return None

        # Convert to string first if not already
        value_str = str(value).strip()

        # Return None for empty strings
        if not value_str:
            return None

        try:
            # Try direct int conversion first
            return int(value_str)
        except ValueError:
            try:
                # If direct int fails, try float conversion (handles "5.0")
                return int(float(value_str))
            except (ValueError, TypeError):
                # If all conversions fail, return None
                logger.warning(f"Failed to convert value '{value_str}' to int")
                return None

    for row in rows:
        risk_id_str = row.data.get("risk_id")
        if not risk_id_str:
            continue

        try:
            risk_id = int(risk_id_str)
        except (ValueError, TypeError):
            logger.warning(f"Invalid risk_id format: {risk_id_str}")
            continue

        # Get the risk factor
        risk_factor = db.query(RiskFactor).filter(RiskFactor.id == risk_id).first()
        if not risk_factor:
            logger.warning(f"Risk factor with id {risk_id} not found")
            continue

        # Update scores from table
        severity_str = row.data.get("severity_score", "")
        probability_str = row.data.get("probability_score", "")

        # Convert string values to integers or None
        new_severity = safe_int_convert(severity_str)
        new_probability = safe_int_convert(probability_str)

        # Update severity score if it has changed (or if it was None and now has value, or vice versa)
        if new_severity != risk_factor.severity_score:
            logger.debug(f"Updating severity_score for risk {risk_id}: {risk_factor.severity_score} -> {new_severity}")
            risk_factor.severity_score = new_severity
            updated_count += 1

        # Update probability score if it has changed
        if new_probability != risk_factor.probability_score:
            logger.debug(f"Updating probability_score for risk {risk_id}: {risk_factor.probability_score} -> {new_probability}")
            risk_factor.probability_score = new_probability
            updated_count += 1

        # Recalculate risk score
        # Only calculate if both scores are not None, otherwise set to None
        if risk_factor.severity_score is not None and risk_factor.probability_score is not None:
            calculated_risk = risk_factor.severity_score * risk_factor.probability_score
            if calculated_risk != risk_factor.risk_score:
                logger.debug(f"Updating risk_score for risk {risk_id}: {risk_factor.risk_score} -> {calculated_risk}")
                risk_factor.risk_score = calculated_risk
                updated_count += 1
        elif risk_factor.risk_score is not None:  # Clear risk score if either severity or probability is None
            logger.debug(f"Clearing risk_score for risk {risk_id} (missing severity or probability)")
            risk_factor.risk_score = None
            updated_count += 1

    db.commit()
    logger.info(f"Risk table sync completed: processed {len(rows)} rows, updated {updated_count} fields")


@router.delete("/project/{project_id}/sheets/{sheet_id}")
async def delete_table(
    project_id: int,
    sheet_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete risk management table"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_risk_table_edit_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit risk tables in this project"
        )

    # Specialist can only edit their assigned lifecycle stage sheet
    if not check_specialist_sheet_access(current_user, project_id, sheet_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Specialists can only edit their assigned lifecycle stage"
        )

    # Find table
    table = db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project_id,
        RiskManagementTable.sheet_id == sheet_id
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Risk management table not found")

    # Delete table (cascades to rows and columns)
    db.delete(table)
    db.commit()

    return {"message": "Risk management table deleted successfully"}


@router.post("/project/{project_id}/sheets/{sheet_id}/rows", response_model=RiskTableRowResponse)
async def add_row(
    project_id: int,
    sheet_id: str,
    row_data: dict,  # Simple dict for now, can be made more structured later
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a new row to the table"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_risk_table_edit_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit risk tables in this project"
        )

    # Specialist can only edit their assigned lifecycle stage sheet
    if not check_specialist_sheet_access(current_user, project_id, sheet_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Specialists can only edit their assigned lifecycle stage"
        )

    table = db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project_id,
        RiskManagementTable.sheet_id == sheet_id
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    # Calculate next row index
    max_row_index = db.query(RiskTableRow).filter(
        RiskTableRow.table_id == table.id
    ).count()

    row = RiskTableRow(
        table_id=table.id,
        row_number=max_row_index + 1,
        row_index=max_row_index,
        data=row_data.get('data', {}),
        cell_colors=row_data.get('cell_colors')
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return row


@router.put("/rows/{row_id}", response_model=RiskTableRowResponse)
async def update_row(
    row_id: int,
    row_update: dict,  # Simple dict for now
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a row"""
    row = db.query(RiskTableRow).filter(RiskTableRow.id == row_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Row not found")

    # Check permissions via project
    if not check_risk_table_edit_permission(row.table.project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit risk tables in this project"
        )

    # Specialist can only edit their assigned lifecycle stage sheet
    if not check_specialist_sheet_access(current_user, row.table.project_id, row.table.sheet_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Specialists can only edit their assigned lifecycle stage"
        )

    # Update fields
    if 'data' in row_update:
        row.data = row_update['data']
    if 'cell_colors' in row_update:
        row.cell_colors = row_update['cell_colors']
    if 'row_number' in row_update:
        row.row_number = row_update['row_number']

    db.commit()
    db.refresh(row)

    # Sync scores back to risk factors if this is a lifecycle stage configured in the project
    project = db.query(Project).filter(Project.id == row.table.project_id).first()
    if project:
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

        if row.table.sheet_id in lifecycle_stages:
            # Get the table again (it might be a bit inefficient but ensures we have current data)
            table = db.query(RiskManagementTable).filter(RiskManagementTable.id == row.table_id).first()
            if table:
                await sync_table_to_risks(db, table, row.table.project_id)

    return row


@router.delete("/rows/{row_id}")
async def delete_row(
    row_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a row"""
    row = db.query(RiskTableRow).filter(RiskTableRow.id == row_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Row not found")

    if not check_risk_table_edit_permission(row.table.project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit risk tables in this project"
        )

    # Specialist can only edit their assigned lifecycle stage sheet
    if not check_specialist_sheet_access(current_user, row.table.project_id, row.table.sheet_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Specialists can only edit their assigned lifecycle stage"
        )

    # Get table to recalculate row numbers
    table_id = row.table_id

    db.delete(row)

    # Recalculate row numbers
    rows = db.query(RiskTableRow).filter(
        RiskTableRow.table_id == table_id
    ).order_by(RiskTableRow.row_index).all()

    for i, row in enumerate(rows):
        row.row_number = i + 1
        row.row_index = i

    db.commit()

    return {"message": "Row deleted successfully"}


@router.get("/project/{project_id}/sheets", response_model=List[RiskManagementTableResponse])
async def get_project_tables(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all risk management tables for a project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_access(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this project"
        )

    return db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project_id
    ).all()


@router.post("/project/{project_id}/sync-risks")
async def sync_risks_to_table(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    Synchronize all risk factors from risk_analyses to risk management tables.
    Creates or updates rows in the appropriate sheet based on lifecycle_stage.
    """
    from ..models.risk_analysis import RiskFactor, RiskAnalysis

    # Get project
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all risk factors for this project
    risk_factors = db.query(RiskFactor).join(RiskAnalysis).filter(
        RiskAnalysis.project_id == project_id
    ).all()

    if not risk_factors:
        return {"message": "No risks to synchronize", "synced_count": 0}

    synced_count = 0

    # Get project lifecycle stages
    lifecycle_stages = []
    if db_project.lifecycle_stages:
        if isinstance(db_project.lifecycle_stages, str):
            import json
            lifecycle_stages = json.loads(db_project.lifecycle_stages)
        else:
            lifecycle_stages = db_project.lifecycle_stages

    if db_project.custom_lifecycle_stages:
        if isinstance(db_project.custom_lifecycle_stages, str):
            import json
            custom_stages = json.loads(db_project.custom_lifecycle_stages)
            lifecycle_stages.extend(custom_stages)
        else:
            lifecycle_stages.extend(db_project.custom_lifecycle_stages)

    # Group risks by lifecycle stage
    for factor in risk_factors:
        # Use lifecycle_stage directly as sheet_id (or fallback to project stages)
        sheet_id = factor.lifecycle_stage if factor.lifecycle_stage in lifecycle_stages else factor.lifecycle_stage

        # Get or create table for this sheet
        table = db.query(RiskManagementTable).filter(
            RiskManagementTable.project_id == project_id,
            RiskManagementTable.sheet_id == sheet_id
        ).first()

        if not table:
            # Create table if doesn't exist
            stage_names = {
                "operation": "Эксплуатация",
                "maintenance": "Техническое обслуживание",
                "storage": "Хранение",
                "transport": "Транспортировка",
                "disposal": "Утилизация"
            }

            table = RiskManagementTable(
                project_id=project_id,
                sheet_id=sheet_id,
                name=f"Управление рисками - {stage_names.get(sheet_id, sheet_id)}"
            )
            db.add(table)
            db.flush()

            # Create columns for this sheet
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

        # Check if this risk already exists in the table (SQLite compatible)
        existing_row = None
        all_rows = db.query(RiskTableRow).filter(RiskTableRow.table_id == table.id).all()
        for row in all_rows:
            if row.data.get("risk_id") == str(factor.id):
                existing_row = row
                break

        # Prepare row data
        # Extract hazard category from hazard_name (format: "[Category] Name")
        hazard_category = ""
        clean_hazard_name = factor.hazard_name or ""
        if factor.hazard_name:
            import re
            category_match = re.match(r'^\[(.+?)\]\s*(.*)$', factor.hazard_name)
            if category_match:
                hazard_category = category_match.group(1)
                clean_hazard_name = category_match.group(2)
        
        row_data = {
            "risk_id": str(factor.id),
            "hazard_category": hazard_category,
            "hazard_name": clean_hazard_name,
            "event_sequence": factor.sequence_of_events or "",
            "hazardous_situation": factor.hazardous_situation or "",
            "harm": factor.harm or "",
            "severity_score": str(factor.severity_score) if factor.severity_score is not None else "",
            "probability_score": str(factor.probability_score) if factor.probability_score is not None else "",
            "risk_score": str(factor.risk_score) if factor.risk_score is not None else "",
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

        synced_count += 1

    db.commit()

    return {
        "message": "Risks synchronized successfully",
        "synced_count": synced_count
    }


@router.put("/project/{project_id}/sheets/{sheet_id}/batch-update")
async def batch_update_rows(
    project_id: int,
    sheet_id: str,
    updates: List[RiskTableRowUpdate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update multiple rows in a risk table incrementally.
    Only updates the specified fields in each row.
    """
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_risk_table_edit_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit risk tables in this project"
        )

    # Specialist can only edit their assigned lifecycle stage sheet
    if not check_specialist_sheet_access(current_user, project_id, sheet_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Specialists can only edit their assigned lifecycle stage"
        )

    # Get the table
    table = db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project_id,
        RiskManagementTable.sheet_id == sheet_id
    ).first()

    if not table:
        raise HTTPException(status_code=404, detail="Risk management table not found")

    updated_rows = []
    sync_needed = False

    # Get lifecycle stages to check if we need to sync with risk factors
    lifecycle_stages = []
    if db_project.lifecycle_stages:
        if isinstance(db_project.lifecycle_stages, str):
            import json
            lifecycle_stages = json.loads(db_project.lifecycle_stages)
        else:
            lifecycle_stages = db_project.lifecycle_stages

    if db_project.custom_lifecycle_stages:
        if isinstance(db_project.custom_lifecycle_stages, str):
            import json
            custom_stages = json.loads(db_project.custom_lifecycle_stages)
            lifecycle_stages.extend(custom_stages)
        else:
            lifecycle_stages.extend(db_project.custom_lifecycle_stages)

    needs_risk_sync = sheet_id in lifecycle_stages

    for update_data in updates:
        row = db.query(RiskTableRow).filter(RiskTableRow.id == update_data.row_id).first()
        if not row:
            logger.warning(f"Row with id {update_data.row_id} not found, skipping")
            continue

        # Update only the specified fields
        if update_data.data:
            # Merge with existing data
            updated_data = {**row.data, **update_data.data}
            row.data = updated_data

        if update_data.cell_colors is not None:
            row.cell_colors = update_data.cell_colors

        updated_rows.append(row)

        # Check if this update affects risk scores that need syncing
        if needs_risk_sync and update_data.data:
            score_fields = ['severity_score', 'probability_score', 'risk_score']
            if any(field in update_data.data for field in score_fields):
                sync_needed = True

    if updated_rows:
        db.commit()
        # Refresh all updated rows
        for row in updated_rows:
            db.refresh(row)

        # Sync with risk factors if needed
        if sync_needed:
            await sync_table_to_risks(db, table, project_id)

    return {
        "message": f"Updated {len(updated_rows)} rows successfully",
        "updated_count": len(updated_rows),
        "sync_performed": sync_needed
    }


@router.put("/project/{project_id}/sheets/{sheet_id}/incremental", response_model=RiskManagementTableResponse)
async def create_or_update_table_incremental(
    project_id: int,
    sheet_id: str,
    table_data: RiskTableDataBulkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create or update risk management table with incremental updates.
    Updates only changed rows instead of replacing the entire table.
    """
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_risk_table_edit_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit risk tables in this project"
        )

    # Specialist can only edit their assigned lifecycle stage sheet
    if not check_specialist_sheet_access(current_user, project_id, sheet_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Specialists can only edit their assigned lifecycle stage"
        )

    # Find existing table or create new one
    table = db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project_id,
        RiskManagementTable.sheet_id == sheet_id
    ).first()

    if not table:
        # Create new table
        table = RiskManagementTable(
            project_id=project_id,
            sheet_id=sheet_id,
            name=table_data.sheet_name,
            icon=table_data.sheet_icon
        )
        db.add(table)
        db.flush()  # Get table ID

        # Create columns
        for col_data in table_data.columns:
            column = RiskTableColumn(
                table_id=table.id,
                key=col_data.key,
                label=col_data.label,
                width=col_data.width,
                column_index=col_data.column_index
            )
            db.add(column)
    else:
        # Update existing table metadata
        if table_data.sheet_name is not None:
            table.name = table_data.sheet_name
        if table_data.sheet_icon is not None:
            table.icon = table_data.sheet_icon

        # Update columns if provided
        if table_data.columns:
            # Delete existing columns and create new ones
            db.query(RiskTableColumn).filter(RiskTableColumn.table_id == table.id).delete()
            for col_data in table_data.columns:
                column = RiskTableColumn(
                    table_id=table.id,
                    key=col_data.key,
                    label=col_data.label,
                    width=col_data.width,
                    column_index=col_data.column_index
                )
                db.add(column)

    # For incremental updates, we assume rows are already managed and only update if explicitly provided
    # This endpoint is mainly for compatibility - prefer batch_update_rows for row changes
    if table_data.rows:
        logger.warning("Incremental endpoint received full row data - consider using batch_update_rows for better performance")

        # Delete existing rows and create new ones (fallback to full update)
        db.query(RiskTableRow).filter(RiskTableRow.table_id == table.id).delete()
        for row_data in table_data.rows:
            row = RiskTableRow(
                table_id=table.id,
                row_number=row_data.row_number,
                row_index=row_data.row_index,
                data=row_data.data,
                cell_colors=row_data.cell_colors
            )
            db.add(row)

    db.commit()
    db.refresh(table)

    return table
