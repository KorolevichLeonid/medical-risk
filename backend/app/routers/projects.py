"""
Projects router
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

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


def check_project_edit_permission(project: Project, user: User, db: Session = None):
    """Check if user can edit project data"""
    # System administrator can edit any project
    if user.role == UserRole.SYS_ADMIN:
        return True
    
    # Project owner (automatically admin role) can edit their project
    if project.owner_id == user.id:
        return True
    
    # Check if user is a project member with manager role
    if db:
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == user.id
        ).first()
        
        if member and member.role in [ProjectRole.ADMIN, ProjectRole.MANAGER]:
            return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not enough permissions to edit this project"
    )


def check_project_delete_permission(project: Project, user: User, db: Session = None):
    """Check if user can delete project (only admin)"""
    # System administrator can delete any project
    if user.role == UserRole.SYS_ADMIN:
        return True
    
    # Project owner (automatically admin role) can delete their project
    if project.owner_id == user.id:
        return True
    
    # Check if user is a project member with admin role
    if db:
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == user.id,
            ProjectMember.role == ProjectRole.ADMIN
        ).first()
        
        if member:
            return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only project administrators can delete projects"
    )


def check_project_member_management_permission(project: Project, user: User, db: Session = None):
    """Check if user can manage project members"""
    # System administrator can manage members in any project
    if user.role == UserRole.SYS_ADMIN:
        return True
    
    # Project owner can manage members
    if project.owner_id == user.id:
        return True
    
    # Check if user is a project member with manager role
    if db:
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == user.id
        ).first()
        
        if member and member.role in [ProjectRole.ADMIN, ProjectRole.MANAGER]:
            return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not enough permissions to manage project members"
    )


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
        owner_id=current_user.id
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
    
    return db_project


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
    
    check_project_edit_permission(db_project, current_user, db)
    
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
    
    check_project_delete_permission(db_project, current_user, db)
    
    # Store project data for logging before deletion
    project_data = {
        "name": db_project.name,
        "description": db_project.description,
        "status": db_project.status.value,
        "device_name": db_project.device_name,
        "owner_id": db_project.owner_id
    }
    project_name = db_project.name
    
    db.delete(db_project)
    db.commit()
    
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
    
    check_project_member_management_permission(db_project, current_user, db)
    
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
    
    check_project_member_management_permission(db_project, current_user, db)
    
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
    
    check_project_edit_permission(db_project, current_user, db)
    
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
