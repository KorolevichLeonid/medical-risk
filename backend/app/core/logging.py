"""
Logging utilities for tracking changes in the system
"""
import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import Request

from ..models import ChangeLog, ActionType, User
from ..database import SessionLocal


def log_action(
    db: Session,
    user: User,
    action_type: ActionType,
    action_description: str,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    target_name: Optional[str] = None,
    project_id: Optional[int] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    extra_data: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None
) -> ChangeLog:
    """
    Log an action in the system
    
    Args:
        db: Database session
        user: User who performed the action
        action_type: Type of action performed
        action_description: Human-readable description
        target_type: Type of target object (e.g., "project", "user")
        target_id: ID of target object
        target_name: Name of target object for display
        project_id: Related project ID (if applicable)
        old_values: Previous values (for updates)
        new_values: New values (for updates)
        extra_data: Additional metadata
        request: FastAPI request object for IP/user agent
    
    Returns:
        Created ChangeLog instance
    """
    # Extract IP and user agent from request if available
    ip_address = None
    user_agent = None
    
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
    
    # Convert dictionaries to JSON strings
    old_values_json = json.dumps(old_values, ensure_ascii=False) if old_values else None
    new_values_json = json.dumps(new_values, ensure_ascii=False) if new_values else None
    extra_data_json = json.dumps(extra_data, ensure_ascii=False) if extra_data else None
    
    # Create changelog entry
    changelog = ChangeLog(
        action_type=action_type,
        action_description=action_description,
        user_id=user.id,
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        project_id=project_id,
        old_values=old_values_json,
        new_values=new_values_json,
        extra_data=extra_data_json,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    db.add(changelog)
    db.commit()
    db.refresh(changelog)
    
    return changelog


def log_project_created(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    project_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log project creation"""
    return log_action(
        db=db,
        user=user,
        action_type=ActionType.PROJECT_CREATED,
        action_description=f"Создан проект '{project_name}'",
        target_type="project",
        target_id=project_id,
        target_name=project_name,
        project_id=project_id,
        new_values=project_data,
        request=request
    )


def log_project_updated(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    old_data: Dict[str, Any],
    new_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log project update"""
    return log_action(
        db=db,
        user=user,
        action_type=ActionType.PROJECT_UPDATED,
        action_description=f"Обновлен проект '{project_name}'",
        target_type="project",
        target_id=project_id,
        target_name=project_name,
        project_id=project_id,
        old_values=old_data,
        new_values=new_data,
        request=request
    )


def log_project_deleted(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    project_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log project deletion"""
    return log_action(
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


def log_project_status_changed(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    old_status: str,
    new_status: str,
    request: Optional[Request] = None
):
    """Log project status change"""
    return log_action(
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


def log_user_added(
    db: Session,
    user: User,
    target_user_id: int,
    target_user_name: str,
    user_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log user creation"""
    return log_action(
        db=db,
        user=user,
        action_type=ActionType.USER_ADDED,
        action_description=f"Добавлен пользователь '{target_user_name}'",
        target_type="user",
        target_id=target_user_id,
        target_name=target_user_name,
        new_values=user_data,
        request=request
    )


def log_user_role_changed(
    db: Session,
    user: User,
    target_user_id: int,
    target_user_name: str,
    old_role: str,
    new_role: str,
    request: Optional[Request] = None
):
    """Log user role change"""
    return log_action(
        db=db,
        user=user,
        action_type=ActionType.USER_ROLE_CHANGED,
        action_description=f"Изменена роль пользователя '{target_user_name}' с '{old_role}' на '{new_role}'",
        target_type="user",
        target_id=target_user_id,
        target_name=target_user_name,
        old_values={"role": old_role},
        new_values={"role": new_role},
        request=request
    )


def log_project_member_added(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    member_user_id: int,
    member_name: str,
    member_role: str,
    request: Optional[Request] = None
):
    """Log project member addition"""
    return log_action(
        db=db,
        user=user,
        action_type=ActionType.PROJECT_MEMBER_ADDED,
        action_description=f"Добавлен участник '{member_name}' в проект '{project_name}' с ролью '{member_role}'",
        target_type="project_member",
        target_id=member_user_id,
        target_name=member_name,
        project_id=project_id,
        new_values={"member_role": member_role, "member_id": member_user_id},
        request=request
    )


def log_project_member_removed(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    member_user_id: int,
    member_name: str,
    member_role: str,
    request: Optional[Request] = None
):
    """Log project member removal"""
    return log_action(
        db=db,
        user=user,
        action_type=ActionType.PROJECT_MEMBER_REMOVED,
        action_description=f"Удален участник '{member_name}' из проекта '{project_name}'",
        target_type="project_member",
        target_id=member_user_id,
        target_name=member_name,
        project_id=project_id,
        old_values={"member_role": member_role, "member_id": member_user_id},
        request=request
    )


def log_risk_created(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    risk_id: int,
    risk_name: str,
    risk_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log risk creation"""
    return log_action(
        db=db,
        user=user,
        action_type=ActionType.RISK_CREATED,
        action_description=f"Создан риск '{risk_name}' в проекте '{project_name}'",
        target_type="risk",
        target_id=risk_id,
        target_name=risk_name,
        project_id=project_id,
        new_values=risk_data,
        request=request
    )


def log_risk_updated(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    risk_id: int,
    risk_name: str,
    old_data: Dict[str, Any],
    new_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log risk update"""
    return log_action(
        db=db,
        user=user,
        action_type=ActionType.RISK_UPDATED,
        action_description=f"Обновлен риск '{risk_name}' в проекте '{project_name}'",
        target_type="risk",
        target_id=risk_id,
        target_name=risk_name,
        project_id=project_id,
        old_values=old_data,
        new_values=new_data,
        request=request
    )


def log_risk_deleted(
    db: Session,
    user: User,
    project_id: int,
    project_name: str,
    risk_id: int,
    risk_name: str,
    risk_data: Dict[str, Any],
    request: Optional[Request] = None
):
    """Log risk deletion"""
    return log_action(
        db=db,
        user=user,
        action_type=ActionType.RISK_DELETED,
        action_description=f"Удален риск '{risk_name}' из проекта '{project_name}'",
        target_type="risk",
        target_id=risk_id,
        target_name=risk_name,
        project_id=project_id,
        old_values=risk_data,
        request=request
    )


def log_user_login(
    db: Session,
    user: User,
    request: Optional[Request] = None
):
    """Log user login"""
    return log_action(
        db=db,
        user=user,
        action_type=ActionType.USER_LOGIN,
        action_description=f"Пользователь {user.first_name} {user.last_name} вошел в систему",
        target_type="user",
        target_id=user.id,
        target_name=f"{user.first_name} {user.last_name}",
        request=request
    )
