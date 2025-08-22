"""
ChangeLog model for tracking all changes in the system
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from datetime import datetime

from ..database import Base


class ActionType(PyEnum):
    """Types of actions that can be logged"""
    # Project actions
    PROJECT_CREATED = "project_created"
    PROJECT_UPDATED = "project_updated"
    PROJECT_DELETED = "project_deleted"
    PROJECT_STATUS_CHANGED = "project_status_changed"
    
    # User actions
    USER_ADDED = "user_added"
    USER_REMOVED = "user_removed"
    USER_ROLE_CHANGED = "user_role_changed"
    USER_PROFILE_UPDATED = "user_profile_updated"
    
    # Risk analysis actions
    RISK_CREATED = "risk_created"
    RISK_UPDATED = "risk_updated"
    RISK_DELETED = "risk_deleted"
    RISK_STATUS_CHANGED = "risk_status_changed"
    
    # Project member actions
    PROJECT_MEMBER_ADDED = "project_member_added"
    PROJECT_MEMBER_REMOVED = "project_member_removed"
    PROJECT_MEMBER_ROLE_CHANGED = "project_member_role_changed"
    
    # Version actions
    VERSION_CREATED = "version_created"
    VERSION_UPDATED = "version_updated"
    
    # System actions
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    SYSTEM_BACKUP = "system_backup"


class ChangeLog(Base):
    """Model for tracking all changes in the system"""
    __tablename__ = "changelogs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Action details
    action_type = Column(Enum(ActionType), nullable=False)
    action_description = Column(Text, nullable=False)  # Human-readable description
    
    # Actor (user who performed the action)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Target object information
    target_type = Column(String, nullable=True)  # "project", "user", "risk", etc.
    target_id = Column(Integer, nullable=True)  # ID of the target object
    target_name = Column(String, nullable=True)  # Name of the target object for display
    
    # Related project (if applicable)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    
    # Change details (JSON-like structure stored as text)
    old_values = Column(Text, nullable=True)  # JSON string of old values
    new_values = Column(Text, nullable=True)  # JSON string of new values
    
    # Additional metadata
    extra_data = Column(Text, nullable=True)  # Any additional information as JSON
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    project = relationship("Project", foreign_keys=[project_id])

    def __repr__(self):
        return f"<ChangeLog(action='{self.action_type.value}', user_id={self.user_id}, target='{self.target_type}:{self.target_id}')>"

    @property
    def action_display_name(self) -> str:
        """Return human-readable action name in Russian"""
        action_names = {
            ActionType.PROJECT_CREATED: "Создан проект",
            ActionType.PROJECT_UPDATED: "Обновлен проект",
            ActionType.PROJECT_DELETED: "Удален проект",
            ActionType.PROJECT_STATUS_CHANGED: "Изменен статус проекта",
            ActionType.USER_ADDED: "Добавлен пользователь",
            ActionType.USER_REMOVED: "Удален пользователь",
            ActionType.USER_ROLE_CHANGED: "Изменена роль пользователя",
            ActionType.USER_PROFILE_UPDATED: "Обновлен профиль пользователя",
            ActionType.RISK_CREATED: "Создан риск",
            ActionType.RISK_UPDATED: "Обновлен риск",
            ActionType.RISK_DELETED: "Удален риск",
            ActionType.RISK_STATUS_CHANGED: "Изменен статус риска",
            ActionType.PROJECT_MEMBER_ADDED: "Добавлен участник проекта",
            ActionType.PROJECT_MEMBER_REMOVED: "Удален участник проекта",
            ActionType.PROJECT_MEMBER_ROLE_CHANGED: "Изменена роль участника",
            ActionType.VERSION_CREATED: "Создана версия",
            ActionType.VERSION_UPDATED: "Обновлена версия",
            ActionType.USER_LOGIN: "Вход в систему",
            ActionType.USER_LOGOUT: "Выход из системы",
            ActionType.SYSTEM_BACKUP: "Резервное копирование",
        }
        return action_names.get(self.action_type, self.action_type.value)
