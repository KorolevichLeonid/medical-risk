"""
Risk management table API router
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.project import Project, ProjectMember, ProjectRole
from ..models.risk_analysis import (
    RiskManagementTable, RiskTableRow, RiskTableColumn, RiskFactor, RiskAnalysis, HazardCategory
)
from ..schemas.risk_analysis import (
    RiskManagementTableResponse, RiskManagementTableCreate,
    RiskManagementTableUpdate, RiskTableDataBulkUpdate,
    RiskTableRowResponse, RiskTableColumnResponse
)
from ..routers.auth import get_current_active_user
from ..routers.projects import get_project, check_project_access

router = APIRouter()
logger = logging.getLogger(__name__)

# Mapping from sheet_id to hazard_category
SHEET_TO_CATEGORY = {
    "sheet1": HazardCategory.ENERGY_FUNCTIONAL,
    "sheet2": HazardCategory.BIOLOGICAL_CHEMICAL,
    "sheet3": HazardCategory.OPERATIONAL_INFORMATIONAL,
    "sheet4": HazardCategory.SOFTWARE
}


def clean_orphaned_rows(db: Session, table: RiskManagementTable, project_id: int, sheet_id: str):
    """
    Remove rows from risk table that don't correspond to existing risk factors.
    Only applies to auto-managed sheets (sheet1-4).
    """
    # Only clean auto-managed sheets
    if sheet_id not in SHEET_TO_CATEGORY:
        return
    
    logger.info(f"Cleaning orphaned rows for project {project_id}, sheet {sheet_id}")
    
    # Get the hazard category for this sheet
    hazard_category = SHEET_TO_CATEGORY[sheet_id]
    
    # Get all risk factor IDs for this category in this project
    valid_risk_ids = set()
    risk_factors = db.query(RiskFactor).join(
        RiskAnalysis, RiskFactor.analysis_id == RiskAnalysis.id
    ).filter(
        RiskAnalysis.project_id == project_id,
        RiskFactor.hazard_category == hazard_category
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


def check_risk_table_edit_permission(project: Project, user: User, db: Session):
    """Check if user can edit risk tables in this project"""
    # For now, allow all authenticated users to edit tables
    # TODO: Implement proper permissions when roles are stabilized
    return True

    # System administrator can edit any project
    if hasattr(user, 'role') and user.role == "SYS_ADMIN":
        return True

    # Project owner can edit
    if project.owner_id == user.id:
        return True

    # Check if user is a project member with doctor role (can edit risk management tables)
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == user.id
    ).first()

    if member and member.role == ProjectRole.DOCTOR:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not enough permissions to edit risk management tables in this project"
    )


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
    
    # Sync scores back to risk factors if sheet is auto-managed (sheets 1-4)
    if sheet_id in ['sheet1', 'sheet2', 'sheet3', 'sheet4']:
        await sync_table_to_risks(db, table, project_id)

    return table


async def sync_table_to_risks(db: Session, table: RiskManagementTable, project_id: int):
    """
    Sync risk scores from table back to risk_factors.
    Updates severity_score, probability_score, and risk_score in risk_factors table.
    """
    from ..models.risk_analysis import RiskFactor
    
    # Get all rows from this table
    rows = db.query(RiskTableRow).filter(
        RiskTableRow.table_id == table.id
    ).all()
    
    for row in rows:
        risk_id_str = row.data.get("risk_id")
        if not risk_id_str:
            continue
        
        try:
            risk_id = int(risk_id_str)
        except (ValueError, TypeError):
            continue
        
        # Get the risk factor
        risk_factor = db.query(RiskFactor).filter(RiskFactor.id == risk_id).first()
        if not risk_factor:
            continue
        
        # Update scores from table
        severity_str = row.data.get("severity_score", "")
        probability_str = row.data.get("probability_score", "")
        
        try:
            if severity_str and severity_str.strip():
                risk_factor.severity_score = int(severity_str)
            
            if probability_str and probability_str.strip():
                risk_factor.probability_score = int(probability_str)
            
            # Recalculate risk score
            if risk_factor.severity_score is not None and risk_factor.probability_score is not None:
                risk_factor.risk_score = risk_factor.severity_score * risk_factor.probability_score
        except (ValueError, TypeError):
            pass  # Skip invalid scores
    
    db.commit()


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

    check_risk_table_edit_permission(db_project, current_user, db)

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

    check_risk_table_edit_permission(db_project, current_user, db)

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
    check_risk_table_edit_permission(row.table.project, current_user, db)

    # Update fields
    if 'data' in row_update:
        row.data = row_update['data']
    if 'cell_colors' in row_update:
        row.cell_colors = row_update['cell_colors']
    if 'row_number' in row_update:
        row.row_number = row_update['row_number']

    db.commit()
    db.refresh(row)
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

    check_risk_table_edit_permission(row.table.project, current_user, db)

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
    Creates or updates rows in the appropriate sheet based on hazard_category.
    """
    from ..models.risk_analysis import RiskFactor, RiskAnalysis
    
    # Mapping of hazard categories to sheet IDs
    CATEGORY_TO_SHEET = {
        "energy_functional": "sheet1",
        "biological_chemical": "sheet2",
        "operational_informational": "sheet3",
        "software": "sheet4"
    }
    
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
    
    # Group risks by category
    for factor in risk_factors:
        sheet_id = CATEGORY_TO_SHEET.get(factor.hazard_category.value, "sheet1")
        
        # Get or create table for this sheet
        table = db.query(RiskManagementTable).filter(
            RiskManagementTable.project_id == project_id,
            RiskManagementTable.sheet_id == sheet_id
        ).first()
        
        if not table:
            # Create table if doesn't exist
            table = RiskManagementTable(
                project_id=project_id,
                sheet_id=sheet_id,
                name=f"Risk Table - {sheet_id}"
            )
            db.add(table)
            db.flush()
            
            # Create columns for this sheet
            columns_def = [
                {"key": "risk_id", "label": "Risk ID", "width": "100px", "index": 0},
                {"key": "lifecycle_stage", "label": "Lifecycle Stage", "width": "180px", "index": 1},
                {"key": "hazard_name", "label": "Hazard Name", "width": "200px", "index": 2},
                {"key": "event_sequence", "label": "Event Sequence", "width": "200px", "index": 3},
                {"key": "hazardous_situation", "label": "Hazardous Situation", "width": "200px", "index": 4},
                {"key": "harm", "label": "Harm", "width": "150px", "index": 5},
                {"key": "severity_score", "label": "Severity Score", "width": "120px", "index": 6},
                {"key": "probability_score", "label": "Probability Score", "width": "150px", "index": 7},
                {"key": "risk_score", "label": "Risk Score", "width": "100px", "index": 8},
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
        row_data = {
            "risk_id": str(factor.id),
            "lifecycle_stage": factor.lifecycle_stage.value if factor.lifecycle_stage else "",
            "hazard_name": factor.hazard_name or "",
            "event_sequence": factor.sequence_of_events or "",
            "hazardous_situation": factor.hazardous_situation or "",
            "harm": factor.harm or "",
            "severity_score": str(factor.severity_score) if factor.severity_score is not None else "",
            "probability_score": str(factor.probability_score) if factor.probability_score is not None else "",
            "risk_score": str(factor.risk_score) if factor.risk_score is not None else ""
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
        
        synced_count += 1
    
    db.commit()
    
    return {
        "message": "Risks synchronized successfully",
        "synced_count": synced_count
    }