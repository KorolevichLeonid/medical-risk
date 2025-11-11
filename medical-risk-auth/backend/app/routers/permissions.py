"""
Permissions API router
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.project import Permission, RolePermission, ProjectMember
from ..models.user import User
from ..routers.auth import get_current_active_user

router = APIRouter()


@router.get("/permissions", response_model=List[dict])
async def get_all_permissions(db: Session = Depends(get_db)):
    """Get all available permissions"""
    permissions = db.query(Permission).all()
    return [{"key": p.key, "label_ru": p.label_ru} for p in permissions]


@router.get("/roles/{role_name}/permissions", response_model=List[str])
async def get_role_permissions(role_name: str, db: Session = Depends(get_db)):
    """Get permissions for a specific role"""
    role_permissions = db.query(RolePermission).filter(
        RolePermission.role_name == role_name
    ).all()

    return [rp.permission_key for rp in role_permissions]


@router.get("/users/me/permissions", response_model=dict)
async def get_user_permissions(
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's permissions, optionally for a specific project"""
    permissions = []
    project_role = None

    # System admin has all permissions
    if hasattr(current_user, 'role') and current_user.role == "SYS_ADMIN":
        all_perms = db.query(Permission).all()
        permissions = [p.key for p in all_perms]
        project_role = "admin"  # Sys admin is always admin in projects
    elif project_id:
        # Get user's role in the project
        from ..models.project import Project
        project = db.query(Project).filter(Project.id == project_id).first()

        if project:
            # Check if user is project owner (always admin)
            if project.owner_id == current_user.id:
                project_role = "admin"
            else:
                # Check if user is a project member
                member = db.query(ProjectMember).filter(
                    ProjectMember.project_id == project_id,
                    ProjectMember.user_id == current_user.id
                ).first()

                if member:
                    project_role = member.role.value

            # Get permissions based on project role
            if project_role:
                role_permissions = db.query(RolePermission).filter(
                    RolePermission.role_name == project_role
                ).all()
                permissions = [rp.permission_key for rp in role_permissions]

    return {
        "user_id": current_user.id,
        "user_name": f"{current_user.first_name} {current_user.last_name}",
        "user_email": current_user.email,
        "user_role": getattr(current_user, 'role', None),
        "project_id": project_id,
        "project_role": project_role,
        "permissions": permissions
    }


@router.get("/users/me/check-permission/{permission_key}")
async def check_user_permission(
    permission_key: str,
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Check if current user has a specific permission"""
    user_perms = await get_user_permissions(project_id, db, current_user)
    has_permission = permission_key in user_perms["permissions"]

    return {
        "has_permission": has_permission,
        "permission": permission_key,
        "user_id": current_user.id
    }
