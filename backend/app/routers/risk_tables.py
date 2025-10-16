"""
Risk management table API router
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.project import Project, ProjectMember, ProjectRole
from ..models.risk_analysis import (
    RiskManagementTable, RiskTableRow, RiskTableColumn
)
from ..schemas.risk_analysis import (
    RiskManagementTableResponse, RiskManagementTableCreate,
    RiskManagementTableUpdate, RiskTableDataBulkUpdate,
    RiskTableRowResponse, RiskTableColumnResponse
)
from ..routers.auth import get_current_active_user
from ..routers.projects import get_project, check_project_access

router = APIRouter()


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

    return table


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
