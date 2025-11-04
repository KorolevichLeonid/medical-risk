"""
Logging helper functions for ChangeLog
"""
import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import Request

from ..models.changelog import ChangeLog, ActionType
from ..models.user import User


async def log_action(
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
):
    """
    Log an action to the ChangeLog
    
    Args:
        db: Database session
        user: User performing the action
        action_type: Type of action from ActionType enum
        action_description: Human-readable description
        target_type: Type of target object (project, user, risk, etc.)
        target_id: ID of target object
        target_name: Display name of target object
        project_id: Related project ID (if applicable)
        old_values: Previous values (for updates)
        new_values: New values (for updates)
        extra_data: Additional metadata
        request: FastAPI request object for IP/user-agent
    """
    
    # Convert dicts to JSON strings
    old_values_json = json.dumps(old_values) if old_values else None
    new_values_json = json.dumps(new_values) if new_values else None
    extra_data_json = json.dumps(extra_data) if extra_data else None
    
    # Extract IP address and user agent from request
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
    
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
    
    return changelog


def create_field_diff(old_obj: Any, new_obj: Any, fields_to_track: list) -> Dict[str, Dict[str, Any]]:
    """
    Create a diff between old and new objects for specified fields
    
    Args:
        old_obj: Old object (can be None for creation)
        new_obj: New object (can be None for deletion)
        fields_to_track: List of field names to track
    
    Returns:
        Dictionary with 'old_values' and 'new_values' keys
    """
    old_values = {}
    new_values = {}
    
    for field in fields_to_track:
        old_value = getattr(old_obj, field, None) if old_obj else None
        new_value = getattr(new_obj, field, None) if new_obj else None
        
        # Convert enum values to strings for JSON serialization
        if hasattr(old_value, 'value'):
            old_value = old_value.value
        if hasattr(new_value, 'value'):
            new_value = new_value.value
        
        # Only track fields that actually changed
        if old_value != new_value:
            if old_obj:
                old_values[field] = old_value
            if new_obj:
                new_values[field] = new_value
    
    return {
        'old_values': old_values if old_values else None,
        'new_values': new_values if new_values else None
    }
