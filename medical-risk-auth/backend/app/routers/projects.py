"""
Projects router
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
import json

from ..database import get_db
from ..models.user import User, UserRole
from ..models.project import Project, ProjectMember, ProjectVersion, ProjectStatus, ProjectRole
from ..schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse,
    ProjectMemberCreate, ProjectMemberResponse, ProjectVersionCreate, ProjectVersionResponse
)
from ..routers.auth import get_current_active_user
from ..core.logging import (
    log_project_created, log_project_updated, log_project_deleted,
    log_project_status_changed, log_project_member_added, log_project_member_removed
)

router = APIRouter()


def get_project(db: Session, project_id: int) -> Project:
    """Get project by ID"""
    return db.query(Project).filter(Project.id == project_id).first()


def check_project_access(project: Project, user: User, db: Session):
    """Check if user has access to project"""
    # System admin can access all projects
    if user.role == UserRole.SYS_ADMIN:
        return True

    # Project owner can access their project
    if project.owner_id == user.id:
        return True

    # Check if user is a member of the project
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == user.id
    ).first()

    return member is not None


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
        from ..models.project import RolePermission
        role_permissions = db.query(RolePermission).filter(
            RolePermission.role_name == project_role
        ).all()
        permission_keys = [rp.permission_key for rp in role_permissions]
        return permission_key in permission_keys

    return False


def check_project_edit_permission(project: Project, user: User, db: Session = None):
    """Check if user can edit project data"""
    return check_user_permission(user, "edit_project", project.id, db)


def check_project_delete_permission(project: Project, user: User, db: Session = None):
    """Check if user can delete project (only admin)"""
    return check_user_permission(user, "delete_project", project.id, db)


def check_project_member_management_permission(project: Project, user: User, db: Session = None):
    """Check if user can manage project members"""
    return check_user_permission(user, "manage_members", project.id, db)


@router.get("/", response_model=List[ProjectListResponse])
async def read_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all projects accessible to the user"""
    if current_user.role == UserRole.SYS_ADMIN:
        # System admin can see all projects
        projects = db.query(Project).offset(skip).limit(limit).all()
    else:
        # Regular users can see projects they own or are members of
        projects = db.query(Project).join(ProjectMember, Project.id == ProjectMember.project_id, isouter=True).filter(
            (Project.owner_id == current_user.id) | (ProjectMember.user_id == current_user.id)
        ).distinct().offset(skip).limit(limit).all()

    # Add member count and user role for each project
    result = []
    for project in projects:
        member_count = db.query(ProjectMember).filter(ProjectMember.project_id == project.id).count()

        # Determine user's role in this project
        user_role = None
        if current_user.role == UserRole.SYS_ADMIN:
            # Sys admin is always admin in every project
            user_role = "admin"
        else:
            # Check if user is owner (project creator = admin)
            if project.owner_id == current_user.id:
                user_role = "admin"
            else:
                # Check if user is member and get their role
                member = db.query(ProjectMember).filter(
                    ProjectMember.project_id == project.id,
                    ProjectMember.user_id == current_user.id
                ).first()
                if member:
                    user_role = member.role.value

        project_data = ProjectListResponse(
            id=project.id,
            name=project.name,
            status=project.status,
            progress_percentage=project.progress_percentage,
            device_name=project.device_name,
            owner_id=project.owner_id,
            created_at=project.created_at,
            member_count=member_count,
            user_role=user_role
        )
        result.append(project_data)

    return result


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new project (all users can create projects)"""
    # All users can create projects
    
    db_project = Project(
        name=project.name,
        description=project.description,
        device_name=project.device_name,
        device_model=project.device_model,
        device_purpose=project.device_purpose,
        device_description=project.device_description,
        device_classification=project.device_classification,
        intended_use=project.intended_use,
        user_profile=project.user_profile,
        operating_environment=project.operating_environment,
        technical_specs=project.technical_specs,
        regulatory_requirements=project.regulatory_requirements,
        standards=project.standards,
        contact_type=project.contact_type,
        duration=project.duration,
        invasiveness=project.invasiveness,
        energy_source=project.energy_source,
        status=project.status if hasattr(project, 'status') else ProjectStatus.DRAFT,
        owner_id=current_user.id,
        lifecycle_stages=json.dumps(project.lifecycle_stages) if project.lifecycle_stages else None,
        custom_lifecycle_stages=json.dumps(project.custom_lifecycle_stages) if project.custom_lifecycle_stages else None,
        hazard_questions=json.dumps(project.hazard_questions) if project.hazard_questions else None,
        custom_hazard=project.custom_hazard,
        hazard_checklist_answers=json.dumps(project.hazard_checklist_answers) if project.hazard_checklist_answers else None,
        active_hazard_categories=json.dumps(project.active_hazard_categories) if project.active_hazard_categories else None,
        severity_levels=json.dumps(project.severity_levels) if project.severity_levels else None,
        probability_levels=json.dumps(project.probability_levels) if project.probability_levels else None,
        risk_threshold=project.risk_threshold if project.risk_threshold else 10
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Create initial version
    initial_version = ProjectVersion(
        project_id=db_project.id,
        version="1.0",
        description="Initial version",
        is_current=True
    )
    db.add(initial_version)
    db.commit()
    
    # Log project creation
    project_data = {
        "name": db_project.name,
        "description": db_project.description,
        "device_name": db_project.device_name,
        "status": db_project.status.value,
        "owner_id": db_project.owner_id
    }
    await log_project_created(
        db=db,
        user=current_user,
        project_id=db_project.id,
        project_name=db_project.name,
        project_data=project_data,
        request=request
    )

    # Return properly formatted response like read_project and update_project
    # Get project members
    owner = db.query(User).filter(User.id == db_project.owner_id).first()
    owner_member = ProjectMemberResponse(
        id=0,  # Special ID for owner
        project_id=db_project.id,
        user_id=owner.id,
        role="admin",  # Project owner is admin
        joined_at=db_project.created_at,
        user_email=owner.email,
        user_first_name=owner.first_name,
        user_last_name=owner.last_name
    )

    # Get project members
    members = db.query(ProjectMember).filter(ProjectMember.project_id == db_project.id).all()
    member_responses = []

    # Add owner to members list
    member_responses.append(owner_member)

    # For sys admin: add them as admin if they're not the owner
    if current_user.role == UserRole.SYS_ADMIN and current_user.id != db_project.owner_id:
        sysadmin_member = ProjectMemberResponse(
            id=-1,  # Special ID for sys admin
            project_id=db_project.id,
            user_id=current_user.id,
            role="admin",  # Sys admin is always admin in any project
            joined_at=db_project.created_at,
            user_email=current_user.email,
            user_first_name=current_user.first_name,
            user_last_name=current_user.last_name
        )
        member_responses.append(sysadmin_member)

    # Add actual project members (excluding owner to avoid duplication)
    for member in members:
        # Skip if this member is the owner (already added above)
        if member.user_id == db_project.owner_id:
            continue

        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            member_responses.append(ProjectMemberResponse(
                id=member.id,
                project_id=member.project_id,
                user_id=member.user_id,
                role=member.role.value,  # Convert enum to string
                joined_at=member.joined_at,
                user_email=user.email,
                user_first_name=user.first_name,
                user_last_name=user.last_name
            ))

    # Deserialize JSON fields for response
    def safe_json_load(data):
        if not data:
            return None
        try:
            return json.loads(data)
        except json.JSONDecodeError:
            return None

    lifecycle_stages_data = safe_json_load(db_project.lifecycle_stages)
    custom_lifecycle_stages_data = safe_json_load(db_project.custom_lifecycle_stages)
    hazard_questions_data = safe_json_load(db_project.hazard_questions)
    hazard_checklist_answers_data = safe_json_load(db_project.hazard_checklist_answers)
    active_hazard_categories_data = safe_json_load(db_project.active_hazard_categories)
    severity_levels_data = safe_json_load(db_project.severity_levels)
    probability_levels_data = safe_json_load(db_project.probability_levels)

    # Create response manually to avoid ORM serialization issues
    response_data = ProjectResponse(
        id=db_project.id,
        name=db_project.name,
        description=db_project.description,
        status=db_project.status,
        progress_percentage=db_project.progress_percentage,
        device_name=db_project.device_name,
        device_model=db_project.device_model,
        device_purpose=db_project.device_purpose,
        device_description=db_project.device_description,
        device_classification=db_project.device_classification,
        intended_use=db_project.intended_use,
        user_profile=db_project.user_profile,
        operating_environment=db_project.operating_environment,
        technical_specs=db_project.technical_specs,
        regulatory_requirements=db_project.regulatory_requirements,
        standards=db_project.standards,
        contact_type=db_project.contact_type,
        duration=db_project.duration,
        invasiveness=db_project.invasiveness,
        energy_source=db_project.energy_source,
        lifecycle_stages=lifecycle_stages_data,
        custom_lifecycle_stages=custom_lifecycle_stages_data,
        hazard_questions=hazard_questions_data,
        custom_hazard=db_project.custom_hazard,
        hazard_checklist_answers=hazard_checklist_answers_data,
        active_hazard_categories=active_hazard_categories_data,
        severity_levels=severity_levels_data,
        probability_levels=probability_levels_data,
        risk_threshold=db_project.risk_threshold if db_project.risk_threshold else 10,
        owner_id=db_project.owner_id,
        created_at=db_project.created_at,
        updated_at=db_project.updated_at,
        members=member_responses,
        versions=[]  # We'll add versions if needed later
    )

    return response_data


@router.get("/{project_id}", response_model=ProjectResponse)
async def read_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get project by ID"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_project_access(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this project"
        )
    
    # Get project members
    owner = db.query(User).filter(User.id == db_project.owner_id).first()
    owner_member = ProjectMemberResponse(
        id=0,  # Special ID for owner
        project_id=project_id,
        user_id=owner.id,
        role="admin",  # Project owner is admin
        joined_at=db_project.created_at,
        user_email=owner.email,
        user_first_name=owner.first_name,
        user_last_name=owner.last_name
    )
    
    # Get project members
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    member_responses = []
    
    # Add owner to members list
    member_responses.append(owner_member)
    
    # For sys admin: add them as admin if they're not the owner
    if current_user.role == UserRole.SYS_ADMIN and current_user.id != db_project.owner_id:
        sysadmin_member = ProjectMemberResponse(
            id=-1,  # Special ID for sys admin
            project_id=project_id,
            user_id=current_user.id,
            role="admin",  # Sys admin is always admin in any project
            joined_at=db_project.created_at,
            user_email=current_user.email,
            user_first_name=current_user.first_name,
            user_last_name=current_user.last_name
        )
        member_responses.append(sysadmin_member)
    
    # Add actual project members (excluding owner to avoid duplication)
    for member in members:
        # Skip if this member is the owner (already added above)
        if member.user_id == db_project.owner_id:
            continue
            
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            member_responses.append(ProjectMemberResponse(
                id=member.id,
                project_id=member.project_id,
                user_id=member.user_id,
                role=member.role.value,  # Convert enum to string
                joined_at=member.joined_at,
                user_email=user.email,
                user_first_name=user.first_name,
                user_last_name=user.last_name
            ))
    
    # Deserialize JSON fields
    lifecycle_stages_data = json.loads(db_project.lifecycle_stages) if db_project.lifecycle_stages else None
    custom_lifecycle_stages_data = json.loads(db_project.custom_lifecycle_stages) if db_project.custom_lifecycle_stages else None
    hazard_questions_data = json.loads(db_project.hazard_questions) if db_project.hazard_questions else None
    hazard_checklist_answers_data = json.loads(db_project.hazard_checklist_answers) if db_project.hazard_checklist_answers else None
    active_hazard_categories_data = json.loads(db_project.active_hazard_categories) if db_project.active_hazard_categories else None
    severity_levels_data = json.loads(db_project.severity_levels) if db_project.severity_levels else None
    probability_levels_data = json.loads(db_project.probability_levels) if db_project.probability_levels else None

    # Create response manually to avoid ORM serialization issues
    response_data = ProjectResponse(
        id=db_project.id,
        name=db_project.name,
        description=db_project.description,
        status=db_project.status,
        progress_percentage=db_project.progress_percentage,
        device_name=db_project.device_name,
        device_model=db_project.device_model,
        device_purpose=db_project.device_purpose,
        device_description=db_project.device_description,
        device_classification=db_project.device_classification,
        intended_use=db_project.intended_use,
        user_profile=db_project.user_profile,
        operating_environment=db_project.operating_environment,
        technical_specs=db_project.technical_specs,
        regulatory_requirements=db_project.regulatory_requirements,
        standards=db_project.standards,
        contact_type=db_project.contact_type,
        duration=db_project.duration,
        invasiveness=db_project.invasiveness,
        energy_source=db_project.energy_source,
        lifecycle_stages=lifecycle_stages_data,
        custom_lifecycle_stages=custom_lifecycle_stages_data,
        hazard_questions=hazard_questions_data,
        custom_hazard=db_project.custom_hazard,
        hazard_checklist_answers=hazard_checklist_answers_data,
        active_hazard_categories=active_hazard_categories_data,
        severity_levels=severity_levels_data,
        probability_levels=probability_levels_data,
        risk_threshold=db_project.risk_threshold if db_project.risk_threshold else 10,
        owner_id=db_project.owner_id,
        created_at=db_project.created_at,
        updated_at=db_project.updated_at,
        members=member_responses,
        versions=[]  # We'll add versions if needed later
    )
    
    return response_data


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update project information"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_edit_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit this project"
        )
    
    # Store old values for logging
    old_values = {
        "name": db_project.name,
        "description": db_project.description,
        "status": db_project.status.value,
        "device_name": db_project.device_name,
        "device_model": db_project.device_model
    }
    
    old_status = db_project.status
    
    # Update fields if provided
    update_data = project_update.dict(exclude_unset=True)
    # Handle JSON serialization for specific fields
    if 'lifecycle_stages' in update_data:
        update_data['lifecycle_stages'] = json.dumps(update_data['lifecycle_stages']) if update_data['lifecycle_stages'] else None
    if 'custom_lifecycle_stages' in update_data:
        update_data['custom_lifecycle_stages'] = json.dumps(update_data['custom_lifecycle_stages']) if update_data['custom_lifecycle_stages'] else None
    if 'hazard_questions' in update_data:
        update_data['hazard_questions'] = json.dumps(update_data['hazard_questions']) if update_data['hazard_questions'] else None
    if 'hazard_checklist_answers' in update_data:
        update_data['hazard_checklist_answers'] = json.dumps(update_data['hazard_checklist_answers']) if update_data['hazard_checklist_answers'] else None
    if 'active_hazard_categories' in update_data:
        update_data['active_hazard_categories'] = json.dumps(update_data['active_hazard_categories']) if update_data['active_hazard_categories'] else None
    if 'severity_levels' in update_data:
        update_data['severity_levels'] = json.dumps(update_data['severity_levels']) if update_data['severity_levels'] else None
    if 'probability_levels' in update_data:
        update_data['probability_levels'] = json.dumps(update_data['probability_levels']) if update_data['probability_levels'] else None

    for field, value in update_data.items():
        setattr(db_project, field, value)

    db.commit()
    db.refresh(db_project)
    
    # Store new values for logging
    new_values = {
        "name": db_project.name,
        "description": db_project.description,
        "status": db_project.status.value,
        "device_name": db_project.device_name,
        "device_model": db_project.device_model
    }
    
    # Log project update
    await log_project_updated(
        db=db,
        user=current_user,
        project_id=db_project.id,
        project_name=db_project.name,
        old_data=old_values,
        new_data=new_values,
        request=request
    )
    
    # Log status change separately if status was changed
    if old_status != db_project.status:
        await log_project_status_changed(
            db=db,
            user=current_user,
            project_id=db_project.id,
            project_name=db_project.name,
            old_status=old_status.value,
            new_status=db_project.status.value,
            request=request
        )
    
    # Return properly formatted response
    # Get owner information
    owner_member = ProjectMemberResponse(
        id=0,  # Virtual member for owner
        project_id=db_project.id,
        user_id=db_project.owner_id,
        role="admin",  # Project owner is admin
        joined_at=db_project.created_at,
        user_email=db_project.owner.email,
        user_first_name=db_project.owner.first_name,
        user_last_name=db_project.owner.last_name
    )
    
    # Get project members with user information
    members = db.query(ProjectMember).filter(
        ProjectMember.project_id == db_project.id
    ).all()
    
    member_responses = []
    
    # Add owner to response first
    member_responses.append(owner_member)
    
    # For sys admin: add them as admin if they're not the owner AND not already a member
    if current_user.role == UserRole.SYS_ADMIN and current_user.id != db_project.owner_id:
        # Check if sys admin is already in project members
        is_already_member = any(member.user_id == current_user.id for member in members)
        if not is_already_member:
            sysadmin_member = ProjectMemberResponse(
                id=-1,  # Special ID for sys admin
                project_id=db_project.id,
                user_id=current_user.id,
                role="admin",  # Sys admin is always admin in any project
                joined_at=db_project.created_at,
                user_email=current_user.email,
                user_first_name=current_user.first_name,
                user_last_name=current_user.last_name
            )
            member_responses.append(sysadmin_member)
    
    # Add actual project members (excluding owner to avoid duplication)
    for member in members:
        # Skip if this member is the owner (already added above)
        if member.user_id == db_project.owner_id:
            continue
        member_user = db.query(User).filter(User.id == member.user_id).first()
        if member_user:
            member_responses.append(ProjectMemberResponse(
                id=member.id,
                project_id=member.project_id,
                user_id=member.user_id,
                role=member.role.value,  # Convert enum to string
                joined_at=member.joined_at,
                user_email=member_user.email,
                user_first_name=member_user.first_name,
                user_last_name=member_user.last_name
            ))
    
    # Deserialize JSON fields for response
    def safe_json_load(data):
        if not data:
            return None
        try:
            return json.loads(data)
        except json.JSONDecodeError:
            return None

    lifecycle_stages_data = safe_json_load(db_project.lifecycle_stages)
    custom_lifecycle_stages_data = safe_json_load(db_project.custom_lifecycle_stages)
    hazard_questions_data = safe_json_load(db_project.hazard_questions)
    hazard_checklist_answers_data = safe_json_load(db_project.hazard_checklist_answers)
    active_hazard_categories_data = safe_json_load(db_project.active_hazard_categories)
    severity_levels_data = safe_json_load(db_project.severity_levels)
    probability_levels_data = safe_json_load(db_project.probability_levels)

    # Create response data
    response_data = ProjectResponse(
        id=db_project.id,
        name=db_project.name,
        description=db_project.description,
        status=db_project.status,
        progress_percentage=db_project.progress_percentage,
        device_name=db_project.device_name,
        device_model=db_project.device_model,
        device_purpose=db_project.device_purpose,
        device_description=db_project.device_description,
        device_classification=db_project.device_classification,
        intended_use=db_project.intended_use,
        user_profile=db_project.user_profile,
        operating_environment=db_project.operating_environment,
        technical_specs=db_project.technical_specs,
        regulatory_requirements=db_project.regulatory_requirements,
        standards=db_project.standards,
        contact_type=db_project.contact_type,
        duration=db_project.duration,
        invasiveness=db_project.invasiveness,
        energy_source=db_project.energy_source,
        lifecycle_stages=lifecycle_stages_data,
        custom_lifecycle_stages=custom_lifecycle_stages_data,
        hazard_questions=hazard_questions_data,
        custom_hazard=db_project.custom_hazard,
        hazard_checklist_answers=hazard_checklist_answers_data,
        active_hazard_categories=active_hazard_categories_data,
        severity_levels=severity_levels_data,
        probability_levels=probability_levels_data,
        risk_threshold=db_project.risk_threshold if db_project.risk_threshold else 10,
        owner_id=db_project.owner_id,
        created_at=db_project.created_at,
        updated_at=db_project.updated_at,
        members=member_responses,
        versions=[]  # We'll add versions if needed later
    )
    
    return response_data


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_delete_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this project"
        )

    # Store project data for logging before deletion
    project_data = {
        "name": db_project.name,
        "description": db_project.description,
        "status": db_project.status.value,
        "device_name": db_project.device_name,
        "owner_id": db_project.owner_id
    }
    project_name = db_project.name

    # Delete related records in correct order to avoid foreign key constraint errors
    try:
        # 1. Delete project members (except owner - they will be handled by project deletion)
        db.query(ProjectMember).filter(ProjectMember.project_id == project_id).delete()

        # 2. Delete risk analyses and their related risk factors
        from ..models.risk_analysis import RiskAnalysis, RiskFactor
        risk_analyses = db.query(RiskAnalysis).filter(RiskAnalysis.project_id == project_id).all()
        for analysis in risk_analyses:
            # Delete risk factors first
            db.query(RiskFactor).filter(RiskFactor.analysis_id == analysis.id).delete()
            # Then delete the analysis
            db.delete(analysis)

        # 3. Delete risk management tables and their related data
        from ..models.risk_analysis import RiskManagementTable, RiskTableRow, RiskTableColumn
        tables = db.query(RiskManagementTable).filter(RiskManagementTable.project_id == project_id).all()
        for table in tables:
            # Delete rows first
            db.query(RiskTableRow).filter(RiskTableRow.table_id == table.id).delete()
            # Delete columns
            db.query(RiskTableColumn).filter(RiskTableColumn.table_id == table.id).delete()
            # Then delete the table
            db.delete(table)

        # 4. Delete project versions
        db.query(ProjectVersion).filter(ProjectVersion.project_id == project_id).delete()

        # 5. Delete changelog entries for this project
        from ..models.changelog import ChangeLog
        db.query(ChangeLog).filter(ChangeLog.project_id == project_id).delete()

        # 6. Delete project invitations (if the table exists)
        try:
            # Try to delete from project_invitations table if it exists
            from sqlalchemy import text
            db.execute(text("DELETE FROM project_invitations WHERE project_id = :project_id"), {"project_id": project_id})
        except Exception:
            # Table might not exist, continue silently
            pass

        # 7. Finally, delete the project itself
        db.delete(db_project)

        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting project: {str(e)}"
        )

    # Log project deletion
    await log_project_deleted(
        db=db,
        user=current_user,
        project_id=project_id,
        project_name=project_name,
        project_data=project_data,
        request=request
    )

    return {"message": "Project deleted successfully"}


@router.post("/{project_id}/members", response_model=ProjectMemberResponse)
async def add_project_member(
    project_id: int,
    member: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a member to the project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_member_management_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to manage project members"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == member.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already a member
    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == member.user_id
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a member")
    
    db_member = ProjectMember(
        project_id=project_id,
        user_id=member.user_id,
        role=member.role  # This will be ProjectRole enum
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    # Log member addition
    await log_project_member_added(
        db=db,
        user=current_user,
        project_id=project_id,
        project_name=db_project.name,
        member_id=user.id,
        member_name=f"{user.first_name} {user.last_name}",
        member_email=user.email,
        member_role=db_member.role.value
    )
    
    # Return properly formatted response
    return ProjectMemberResponse(
        id=db_member.id,
        project_id=db_member.project_id,
        user_id=db_member.user_id,
        role=db_member.role.value,  # Convert enum to string
        joined_at=db_member.joined_at,
        user_email=user.email,
        user_first_name=user.first_name,
        user_last_name=user.last_name
    )


@router.delete("/{project_id}/members/{user_id}")
async def remove_project_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a member from the project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_member_management_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to manage project members"
        )
    
    # Cannot remove project owner
    if user_id == db_project.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove project owner")
    
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Get member user info for logging
    member_user = db.query(User).filter(User.id == user_id).first()
    member_name = f"{member_user.first_name} {member_user.last_name}" if member_user else f"User {user_id}"
    member_email = member_user.email if member_user else "Unknown"
    member_role = member.role.value
    
    db.delete(member)
    db.commit()
    
    # Log member removal
    await log_project_member_removed(
        db=db,
        user=current_user,
        project_id=project_id,
        project_name=db_project.name,
        member_id=user_id,
        member_name=member_name,
        member_email=member_email,
        member_role=member_role
    )
    
    return {"message": "Member removed successfully"}


@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
async def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all members of a project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_project_access(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this project"
        )
    
    # Get project owner
    owner = db.query(User).filter(User.id == db_project.owner_id).first()
    owner_member = ProjectMemberResponse(
        id=0,  # Special ID for owner
        project_id=project_id,
        user_id=owner.id,
        role="admin",  # Project owner is always admin
        joined_at=db_project.created_at,
        user_email=owner.email,
        user_first_name=owner.first_name,
        user_last_name=owner.last_name
    )
    
    # Get project members
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    member_responses = []
    
    # Add owner to members list first (always admin)
    member_responses.append(owner_member)
    
    # For sys admin: add them as admin if they're not the owner AND not already a member
    if current_user.role == UserRole.SYS_ADMIN and current_user.id != db_project.owner_id:
        # Check if sys admin is already in project members
        is_already_member = any(member.user_id == current_user.id for member in members)
        if not is_already_member:
            sysadmin_member = ProjectMemberResponse(
                id=-1,  # Special ID for sys admin
                project_id=project_id,
                user_id=current_user.id,
                role="admin",  # Sys admin is always admin in any project
                joined_at=db_project.created_at,
                user_email=current_user.email,
                user_first_name=current_user.first_name,
                user_last_name=current_user.last_name
            )
            member_responses.append(sysadmin_member)
    
    # Add actual project members (excluding owner to avoid duplication)
    for member in members:
        # Skip if this member is the owner (already added above)
        if member.user_id == db_project.owner_id:
            continue
            
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:  # Show all project members
            member_responses.append(ProjectMemberResponse(
                id=member.id,
                project_id=member.project_id,
                user_id=member.user_id,
                role=member.role.value,  # Convert enum to string
                joined_at=member.joined_at,
                user_email=user.email,
                user_first_name=user.first_name,
                user_last_name=user.last_name
            ))
    
    # Return all members (owner already added first)
    return member_responses


@router.post("/{project_id}/versions", response_model=ProjectVersionResponse)
async def create_project_version(
    project_id: int,
    version: ProjectVersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new project version"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_edit_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit this project"
        )

    # Check if version already exists
    existing_version = db.query(ProjectVersion).filter(
        ProjectVersion.project_id == project_id,
        ProjectVersion.version == version.version
    ).first()
    if existing_version:
        raise HTTPException(status_code=400, detail="Version already exists")

    # Set all other versions as not current
    db.query(ProjectVersion).filter(ProjectVersion.project_id == project_id).update({"is_current": False})

    db_version = ProjectVersion(
        project_id=project_id,
        version=version.version,
        description=version.description,
        is_current=True
    )
    db.add(db_version)
    db.commit()
    db.refresh(db_version)

    return db_version


@router.get("/{project_id}/my-role")
async def get_my_project_role(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's role in the project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_access(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this project"
        )

    # Determine user's role in this project
    user_role = None
    if current_user.role == UserRole.SYS_ADMIN:
        # Sys admin is always admin in every project
        user_role = "admin"
    else:
        # Check if user is owner (project creator = admin)
        if db_project.owner_id == current_user.id:
            user_role = "admin"
        else:
            # Check if user is member and get their role
            member = db.query(ProjectMember).filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id
            ).first()
            if member:
                user_role = member.role.value

    # Deserialize lifecycle stages
    def safe_json_load(data):
        if not data:
            return None
        try:
            return json.loads(data)
        except json.JSONDecodeError:
            return None

    lifecycle_stages_data = safe_json_load(db_project.lifecycle_stages)
    custom_lifecycle_stages_data = safe_json_load(db_project.custom_lifecycle_stages)

    return {
        "project_id": project_id,
        "user_id": current_user.id,
        "user_role": user_role,
        "user_name": f"{current_user.first_name} {current_user.last_name}",
        "project_name": db_project.name,
        "lifecycle_stages": lifecycle_stages_data,
        "custom_lifecycle_stages": custom_lifecycle_stages_data
    }
