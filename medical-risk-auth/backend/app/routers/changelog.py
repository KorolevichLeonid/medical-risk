"""
ChangeLog router for API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import math
import json

from ..database import get_db
from ..models import User, Project, ChangeLog, ActionType, UserRole
from ..schemas.changelog import (
    ChangeLogResponse, ChangeLogListResponse, ProjectChangeLogResponse,
    ProjectsChangeLogResponse, ChangeLogDetailResponse, CreateChangeLogRequest
)
from ..routers.auth import get_current_user


router = APIRouter(prefix="/api/changelog", tags=["changelog"])


def check_changelog_access_all_projects(current_user: User):
    """Check if user has access to view all projects changelog (only sys_admin)"""
    if current_user.role != UserRole.SYS_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only system administrators can view all projects changelog."
        )


def check_project_changelog_access(current_user: User, project: Project, db: Session):
    """Check if user has access to specific project changelog"""
    from ..models.project import ProjectMember, ProjectRole
    
    # Sys admin can view all project logs
    if current_user.role == UserRole.SYS_ADMIN:
        return True
    
    # Project owner can view their project logs
    if project.owner_id == current_user.id:
        return True
    
    # Check if user has ADMIN role in this project
    admin_membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == current_user.id,
        ProjectMember.role == ProjectRole.ADMIN
    ).first()
    
    if admin_membership:
        return True
    
    # Only admins (system, project owner, or project admin role) can view logs
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied. Only project administrators can view project logs."
    )


@router.get("/projects", response_model=ProjectsChangeLogResponse)
async def get_projects_changelog(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get changelog for all projects with recent changes"""
    
    # Role-based project filtering
    if current_user.role == UserRole.SYS_ADMIN:
        # SYS_ADMIN sees all projects
        projects = db.query(Project).options(
            joinedload(Project.owner)
        ).all()
    else:
        # USER sees only projects where they are admin (owner or ProjectRole.ADMIN)
        from ..models.project import ProjectMember, ProjectRole
        
        # Get projects where user is owner
        owned_projects = db.query(Project).filter(
            Project.owner_id == current_user.id
        ).options(joinedload(Project.owner)).all()
        
        # Get projects where user has ADMIN role as member
        admin_project_ids = db.query(ProjectMember.project_id).filter(
            ProjectMember.user_id == current_user.id,
            ProjectMember.role == ProjectRole.ADMIN
        ).all()
        admin_project_ids = [pid[0] for pid in admin_project_ids]
        
        admin_projects = db.query(Project).filter(
            Project.id.in_(admin_project_ids)
        ).options(joinedload(Project.owner)).all() if admin_project_ids else []
        
        # Combine and deduplicate
        project_ids = set()
        projects = []
        
        for project in owned_projects + admin_projects:
            if project.id not in project_ids:
                projects.append(project)
                project_ids.add(project.id)
    
    projects_with_changes = []
    
    for project in projects:
        # Get last 4 changes for this project
        recent_changes_query = db.query(ChangeLog).filter(
            ChangeLog.project_id == project.id
        ).options(
            joinedload(ChangeLog.user)
        ).order_by(ChangeLog.created_at.desc()).limit(4)
        
        recent_changes = recent_changes_query.all()
        
        # Get total changes count
        total_changes = db.query(ChangeLog).filter(
            ChangeLog.project_id == project.id
        ).count()
        
        # Get members count
        from ..models.project import ProjectMember
        members_count = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id
        ).count() + 1  # +1 for owner
        
        # Get last updated time (most recent changelog entry)
        last_update = None
        if recent_changes:
            last_update = recent_changes[0].created_at
        else:
            # If no changelog, use project created_at
            last_update = project.created_at
        
        # Convert changes to response format
        change_responses = []
        for change in recent_changes:
            change_responses.append(ChangeLogResponse(
                id=change.id,
                action_type=change.action_type,
                action_description=change.action_description,
                action_display_name=change.action_display_name,
                user_id=change.user_id,
                user_name=f"{change.user.first_name} {change.user.last_name}",
                user_role=change.user.role.value,
                target_type=change.target_type,
                target_id=change.target_id,
                target_name=change.target_name,
                project_id=change.project_id,
                project_name=project.name if change.project else None,
                old_values=change.old_values,
                new_values=change.new_values,
                extra_data=change.extra_data,
                created_at=change.created_at
            ))
        
        project_changelog = ProjectChangeLogResponse(
            project_id=project.id,
            project_name=project.name,
            project_status=project.status.value,
            project_description=project.description,
            device_name=project.device_name,
            members_count=members_count,
            last_updated=last_update,
            recent_changes=change_responses,
            total_changes=total_changes
        )
        
        projects_with_changes.append(project_changelog)
    
    return ProjectsChangeLogResponse(
        projects=projects_with_changes,
        total_projects=len(projects_with_changes)
    )


@router.get("/project/{project_id}", response_model=ChangeLogListResponse)
async def get_project_changelog(
    project_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get full changelog for a specific project with pagination"""
    
    # Check if project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check if user has access to this project's changelog
    check_project_changelog_access(current_user, project, db)
    
    # Get total count
    total = db.query(ChangeLog).filter(ChangeLog.project_id == project_id).count()
    
    # Calculate pagination
    offset = (page - 1) * size
    total_pages = math.ceil(total / size)
    
    # Get changes with pagination
    changes = db.query(ChangeLog).filter(
        ChangeLog.project_id == project_id
    ).options(
        joinedload(ChangeLog.user),
        joinedload(ChangeLog.project)
    ).order_by(ChangeLog.created_at.desc()).offset(offset).limit(size).all()
    
    # Convert to response format
    change_responses = []
    for change in changes:
        change_responses.append(ChangeLogResponse(
            id=change.id,
            action_type=change.action_type,
            action_description=change.action_description,
            action_display_name=change.action_display_name,
            user_id=change.user_id,
            user_name=f"{change.user.first_name} {change.user.last_name}",
            user_role=change.user.role.value,
            target_type=change.target_type,
            target_id=change.target_id,
            target_name=change.target_name,
            project_id=change.project_id,
            project_name=change.project.name if change.project else None,
            old_values=change.old_values,
            new_values=change.new_values,
            extra_data=change.extra_data,
            created_at=change.created_at
        ))
    
    return ChangeLogListResponse(
        changelogs=change_responses,
        total=total,
        page=page,
        size=size,
        total_pages=total_pages
    )


@router.get("/{changelog_id}", response_model=ChangeLogDetailResponse)
async def get_changelog_detail(
    changelog_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about a specific changelog entry"""
    
    # First get the changelog to check project access
    changelog = db.query(ChangeLog).options(
        joinedload(ChangeLog.project)
    ).filter(ChangeLog.id == changelog_id).first()
    
    if not changelog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Changelog entry not found"
        )
    
    # Check if user has access to this project's changelog
    if changelog.project:
        check_project_changelog_access(current_user, changelog.project, db)
    # For system-wide logs that are not project-specific, only sys_admin can view
    elif current_user.role != UserRole.SYS_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only system administrators can view system-wide logs."
        )
    
    # Get changelog with user and project data
    changelog = db.query(ChangeLog).options(
        joinedload(ChangeLog.user),
        joinedload(ChangeLog.project)
    ).filter(ChangeLog.id == changelog_id).first()
    
    if not changelog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Changelog entry not found"
        )
    
    # Parse JSON fields
    old_values = None
    new_values = None
    extra_data = None
    
    try:
        if changelog.old_values:
            old_values = json.loads(changelog.old_values)
    except json.JSONDecodeError:
        pass
    
    try:
        if changelog.new_values:
            new_values = json.loads(changelog.new_values)
    except json.JSONDecodeError:
        pass
    
    try:
        if changelog.extra_data:
            extra_data = json.loads(changelog.extra_data)
    except json.JSONDecodeError:
        pass
    
    return ChangeLogDetailResponse(
        id=changelog.id,
        action_type=changelog.action_type,
        action_description=changelog.action_description,
        action_display_name=changelog.action_display_name,
        user_id=changelog.user_id,
        user_name=f"{changelog.user.first_name} {changelog.user.last_name}",
        user_email=changelog.user.email,
        user_role=changelog.user.role.value,
        user_position=changelog.user.position,
        target_type=changelog.target_type,
        target_id=changelog.target_id,
        target_name=changelog.target_name,
        project_id=changelog.project_id,
        project_name=changelog.project.name if changelog.project else None,
        old_values=old_values,
        new_values=new_values,
        extra_data=extra_data,
        ip_address=changelog.ip_address,
        user_agent=changelog.user_agent,
        created_at=changelog.created_at
    )


@router.post("/", response_model=ChangeLogResponse)
async def create_changelog_entry(
    request: CreateChangeLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new changelog entry (internal API)"""
    # Convert dicts to JSON strings
    old_values_json = json.dumps(request.old_values) if request.old_values else None
    new_values_json = json.dumps(request.new_values) if request.new_values else None
    extra_data_json = json.dumps(request.extra_data) if request.extra_data else None
    
    # Create changelog entry
    changelog = ChangeLog(
        action_type=request.action_type,
        action_description=request.action_description,
        user_id=current_user.id,
        target_type=request.target_type,
        target_id=request.target_id,
        target_name=request.target_name,
        project_id=request.project_id,
        old_values=old_values_json,
        new_values=new_values_json,
        extra_data=extra_data_json,
        ip_address=request.ip_address,
        user_agent=request.user_agent
    )
    
    db.add(changelog)
    db.commit()
    db.refresh(changelog)
    
    # Load user for response
    db.refresh(changelog, ['user'])
    
    return ChangeLogResponse(
        id=changelog.id,
        action_type=changelog.action_type,
        action_description=changelog.action_description,
        action_display_name=changelog.action_display_name,
        user_id=changelog.user_id,
        user_name=f"{changelog.user.first_name} {changelog.user.last_name}",
        user_role=changelog.user.role.value,
        target_type=changelog.target_type,
        target_id=changelog.target_id,
        target_name=changelog.target_name,
        project_id=changelog.project_id,
        project_name=None,  # Will be loaded separately if needed
        old_values=changelog.old_values,
        new_values=changelog.new_values,
        extra_data=changelog.extra_data,
        created_at=changelog.created_at
    )
