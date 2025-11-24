"""
Logging functions for various system operations
"""
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import Request

from .logging_helper import log_action
from ..models.changelog import ActionType
from ..models.user import User


async def log_project_created(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    project_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log project creation"""
    await log_action(
        db=db,
        user=user,
        action_type=ActionType.PROJECT_CREATED,
        action_description=f"Создан новый проект '{project_name}'",
        target_type="project",
        target_id=project_id,
        target_name=project_name,
        project_id=project_id,
        new_values=project_data,
        request=request
    )


async def log_project_updated(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    old_data: Dict[str, Any],
    new_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log project update"""
    # Only log fields that actually changed
    changed_fields = {}
    old_changed = {}
    
    for key in old_data:
        if old_data[key] != new_data.get(key):
            old_changed[key] = old_data[key]
            changed_fields[key] = new_data[key]
    
    if changed_fields:  # Only log if something actually changed
        await log_action(
            db=db,
            user=user,
            action_type=ActionType.PROJECT_UPDATED,
            action_description=f"Обновлен проект '{project_name}'. Изменены поля: {', '.join(changed_fields.keys())}",
            target_type="project",
            target_id=project_id,
            target_name=project_name,
            project_id=project_id,
            old_values=old_changed,
            new_values=changed_fields,
            request=request
        )


async def log_project_deleted(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    project_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log project deletion"""
    await log_action(
        db=db,
        user=user,
        action_type=ActionType.PROJECT_DELETED,
        action_description=f"Удален проект '{project_name}'",
        target_type="project",
        target_id=project_id,
        target_name=project_name,
        project_id=project_id,
        old_values=project_data,
        request=request
    )


async def log_project_status_changed(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    old_status: str,
    new_status: str,
    request: Optional[Request] = None
):
    """Log project status change"""
    await log_action(
        db=db,
        user=user,
        action_type=ActionType.PROJECT_STATUS_CHANGED,
        action_description=f"Изменен статус проекта '{project_name}' с '{old_status}' на '{new_status}'",
        target_type="project",
        target_id=project_id,
        target_name=project_name,
        project_id=project_id,
        old_values={"status": old_status},
        new_values={"status": new_status},
        request=request
    )


async def log_project_member_added(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    member_id: int,
    member_name: str,
    member_email: str,
    member_role: str,
    request: Optional[Request] = None
):
    """Log project member addition"""
    await log_action(
        db=db,
        user=user,
        action_type=ActionType.PROJECT_MEMBER_ADDED,
        action_description=f"Добавлен участник {member_name} ({member_email}) с ролью '{member_role}' в проект '{project_name}'",
        target_type="user",
        target_id=member_id,
        target_name=member_name,
        project_id=project_id,
        new_values={
            "user_id": member_id,
            "user_name": member_name,
            "user_email": member_email,
            "role": member_role
        },
        request=request
    )


async def log_project_member_removed(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    member_id: int,
    member_name: str,
    member_email: str,
    member_role: str,
    request: Optional[Request] = None
):
    """Log project member removal"""
    await log_action(
        db=db,
        user=user,
        action_type=ActionType.PROJECT_MEMBER_REMOVED,
        action_description=f"Удален участник {member_name} ({member_email}) с ролью '{member_role}' из проекта '{project_name}'",
        target_type="user",
        target_id=member_id,
        target_name=member_name,
        project_id=project_id,
        old_values={
            "user_id": member_id,
            "user_name": member_name,
            "user_email": member_email,
            "role": member_role
        },
        request=request
    )


async def log_project_member_role_changed(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    member_id: int,
    member_name: str,
    old_role: str,
    new_role: str,
    request: Optional[Request] = None
):
    """Log project member role change"""
    await log_action(
        db=db,
        user=user,
        action_type=ActionType.PROJECT_MEMBER_ROLE_CHANGED,
        action_description=f"Изменена роль участника {member_name} в проекте '{project_name}' с '{old_role}' на '{new_role}'",
        target_type="user",
        target_id=member_id,
        target_name=member_name,
        project_id=project_id,
        old_values={"role": old_role},
        new_values={"role": new_role},
        request=request
    )


# Risk analysis logging functions
async def log_risk_created(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    risk_id: int,
    risk_description: str,
    risk_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log risk analysis creation"""
    await log_action(
        db=db,
        user=user,
        action_type=ActionType.RISK_CREATED,
        action_description=f"Создан риск '{risk_description}' в проекте '{project_name}'",
        target_type="risk",
        target_id=risk_id,
        target_name=risk_description,
        project_id=project_id,
        new_values=risk_data,
        request=request
    )


async def log_risk_updated(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    risk_id: int,
    risk_description: str,
    old_data: Dict[str, Any],
    new_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log risk analysis update"""
    # Only log fields that actually changed
    changed_fields = {}
    old_changed = {}
    
    for key in old_data:
        if old_data[key] != new_data.get(key):
            old_changed[key] = old_data[key]
            changed_fields[key] = new_data[key]
    
    if changed_fields:  # Only log if something actually changed
        await log_action(
            db=db,
            user=user,
            action_type=ActionType.RISK_UPDATED,
            action_description=f"Обновлен риск '{risk_description}' в проекте '{project_name}'. Изменены поля: {', '.join(changed_fields.keys())}",
            target_type="risk",
            target_id=risk_id,
            target_name=risk_description,
            project_id=project_id,
            old_values=old_changed,
            new_values=changed_fields,
            request=request
        )


async def log_risk_deleted(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    risk_id: int,
    risk_description: str,
    risk_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log risk analysis deletion"""
    await log_action(
        db=db,
        user=user,
        action_type=ActionType.RISK_DELETED,
        action_description=f"Удален риск '{risk_description}' из проекта '{project_name}'",
        target_type="risk",
        target_id=risk_id,
        target_name=risk_description,
        project_id=project_id,
        old_values=risk_data,
        request=request
    )


# User authentication logging functions
async def log_user_login(
    db: Session,
    user: User,
    request: Optional[Request] = None
):
    """Log user login"""
    await log_action(
        db=db,
        user=user,
        action_type=ActionType.USER_LOGIN,
        action_description=f"Пользователь {user.first_name} {user.last_name} ({user.email}) выполнил вход в систему",
        target_type="user",
        target_id=user.id,
        target_name=f"{user.first_name} {user.last_name}",
        extra_data={
            "user_email": user.email,
            "user_role": user.role.value,
            "login_time": str(user.last_login) if user.last_login else None
        },
        request=request
    )


async def log_user_logout(
    db: Session,
    user: User,
    request: Optional[Request] = None
):
    """Log user logout"""
    await log_action(
        db=db,
        user=user,
        action_type=ActionType.USER_LOGOUT,
        action_description=f"Пользователь {user.first_name} {user.last_name} ({user.email}) вышел из системы",
        target_type="user",
        target_id=user.id,
        target_name=f"{user.first_name} {user.last_name}",
        extra_data={
            "user_email": user.email,
            "user_role": user.role.value
        },
        request=request
    )