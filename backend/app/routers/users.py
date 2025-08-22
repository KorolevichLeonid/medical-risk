"""
Users router
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from ..models.project import Project, ProjectMember
from ..schemas.user import UserCreate, UserUpdate, UserResponse
from ..routers.auth import get_current_active_user, check_user_role

router = APIRouter()


def get_user(db: Session, user_id: int) -> User:
    """Get user by ID"""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user: UserCreate) -> User:
    """Create a new user (admin only - Azure users are auto-created)"""
    db_user = User(
        email=user.email,
        azure_object_id=user.azure_object_id,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        language=user.language,
        is_active=user.is_active,
        is_verified=True  # Users created by admin are verified
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def check_sys_admin_permission(current_user: User):
    """Check if current user has sys admin permissions"""
    if current_user.role != UserRole.SYS_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав. Требуются права системного администратора."
        )


def check_admin_permission(current_user: User):
    """Check if current user has admin permissions (only sys admin now)"""
    if current_user.role != UserRole.SYS_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав. Требуются права системного администратора."
        )


def check_has_role(current_user: User):
    """Check if current user has any role assigned"""
    # All users now have USER role by default, this check is no longer needed
    pass


def can_manage_user_role(current_user: User, target_user: User):
    """Check if current user can manage target user's role"""
    # Only sys admin can promote users to sys admin
    if current_user.role == UserRole.SYS_ADMIN:
        return True
    
    # Others cannot manage roles
    return False


def can_manage_user_activation(current_user: User, target_user: User):
    """Check if current user can activate/deactivate target user"""
    # Only sys admin can manage user activation
    if current_user.role == UserRole.SYS_ADMIN:
        return True
    
    # Others cannot manage activation
    return False


def can_create_user_role(current_user: User, new_role: UserRole):
    """Check if current user can create users with specific role"""
    # Only sys admin can create users with different roles
    if current_user.role == UserRole.SYS_ADMIN:
        return True
    
    # Others cannot create users
    return False


@router.get("/", response_model=List[UserResponse])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get users based on current user's role"""
    if current_user.role == UserRole.SYS_ADMIN:
        # Sys admin sees everyone
        users = db.query(User).offset(skip).limit(limit).all()
    else:
        # Regular users can only see users participating in their projects
        # Get projects where current user is owner or member
        owned_projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
        member_projects = db.query(Project).join(ProjectMember, Project.id == ProjectMember.project_id).filter(
            ProjectMember.user_id == current_user.id
        ).all()
        
        project_ids = list(set([p.id for p in owned_projects + member_projects]))
        
        if not project_ids:
            # If user has no projects, they can only see themselves
            users = [current_user]
        else:
            # Get all users who are owners or members of these projects
            project_users = set()
            for project_id in project_ids:
                # Add project owner
                project = db.query(Project).filter(Project.id == project_id).first()
                if project:
                    project_users.add(project.owner_id)
                
                # Add project members
                members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
                for member in members:
                    project_users.add(member.user_id)
            
            # Get user objects
            users = db.query(User).filter(
                User.id.in_(list(project_users)),
                User.is_active == True
            ).offset(skip).limit(limit).all()
    
    return users





@router.post("/", response_model=UserResponse)
async def create_new_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new user (admin and sys admin only)"""
    check_admin_permission(current_user)
    
    # Check if current user can create users with this role
    if not can_create_user_role(current_user, user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для создания пользователя с такой ролью"
        )
    
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email уже зарегистрирован"
        )
    return create_user(db=db, user=user)


@router.get("/{user_id}", response_model=UserResponse)
async def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user by ID"""
    # Users can only see their own profile unless they're sys admin
    if user_id != current_user.id and current_user.role != UserRole.SYS_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав"
        )
    
    db_user = get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return db_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update user information"""
    db_user = get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Users can update their own profile
    if user_id == current_user.id:
        # Users cannot change their own role
        if user_update.role is not None and user_update.role != current_user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нельзя изменить свою роль"
            )
    else:
        # Check if current user can manage this user
        if not can_manage_user_role(current_user, db_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для управления этим пользователем"
            )
    
    # Update fields if provided
    update_data = user_update.dict(exclude_unset=True)
    
    # Update fields
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/{user_id}/activate")
async def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Activate/deactivate user (admin and sys admin only)"""
    check_admin_permission(current_user)
    
    db_user = get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Check if current user can manage this user's activation
    if not can_manage_user_activation(current_user, db_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для управления активацией этого пользователя"
        )
    
    db_user.is_active = not db_user.is_active
    db.commit()
    db.refresh(db_user)
    
    status_text = "активирован" if db_user.is_active else "деактивирован"
    return {"message": f"Пользователь {status_text} успешно"}


@router.get("/{user_id}/projects")
async def get_user_projects(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get projects for a specific user"""
    # Users can only see their own projects unless they're sys admin
    if user_id != current_user.id and current_user.role != UserRole.SYS_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав"
        )
    
    db_user = get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Get projects owned by user
    owned_projects = db.query(Project).filter(Project.owner_id == user_id).all()
    
    # Get projects where user is a member
    member_projects = db.query(Project).join(ProjectMember, Project.id == ProjectMember.project_id).filter(
        ProjectMember.user_id == user_id
    ).all()
    
    # Combine and remove duplicates
    all_projects = list({project.id: project for project in owned_projects + member_projects}.values())
    
    return [
        {
            "id": project.id,
            "name": project.name,
            "status": project.status,
            "device_name": project.device_name,
            "is_owner": project.owner_id == user_id
        }
        for project in all_projects
    ]


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete user (admin only)"""
    check_admin_permission(current_user)
    
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить свой собственный аккаунт"
        )
    
    db_user = get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    db.delete(db_user)
    db.commit()
    return {"message": "Пользователь успешно удален"}
