from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User, UserRole
from ..models.project import Project, ProjectMember
from ..schemas.user import UserResponse, UserUpdate
from ..routers.auth import get_current_active_user
from ..schemas.project import ProjectListResponse

router = APIRouter(
    tags=["users"]
)


@router.get("/{user_id}/projects", response_model=List[ProjectListResponse])
async def get_user_projects(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get projects for a specific user"""
    # Check if current user can view this user's projects
    if current_user.role != UserRole.SYS_ADMIN and current_user.id != user_id:
        # Regular users can only see projects of users they work with
        shared_projects = db.query(Project).join(ProjectMember, Project.id == ProjectMember.project_id).filter(
            ProjectMember.user_id == current_user.id
        ).all()
        
        shared_project_ids = [p.id for p in shared_projects]
        
        # Check if the requested user participates in any shared projects
        target_user_projects = db.query(Project).filter(
            Project.owner_id == user_id
        ).filter(
            Project.id.in_(shared_project_ids)
        ).all() if shared_project_ids else []
        
        member_projects = db.query(Project).join(ProjectMember, Project.id == ProjectMember.project_id).filter(
            ProjectMember.user_id == user_id
        ).filter(
            Project.id.in_(shared_project_ids)
        ).all() if shared_project_ids else []
        
        all_projects = list(set(target_user_projects + member_projects))
        
        if not all_projects:
            raise HTTPException(status_code=403, detail="Not authorized to view this user's projects")
    else:
        # Get projects where user is owner
        owned_projects = db.query(Project).filter(Project.owner_id == user_id).all()
        
        # Get projects where user is member
        member_projects = db.query(Project).join(ProjectMember, Project.id == ProjectMember.project_id).filter(
            ProjectMember.user_id == user_id
        ).all()
        
        all_projects = list(set(owned_projects + member_projects))
    
    # Transform to response format
    project_responses = []
    for project in all_projects:
        is_owner = project.owner_id == user_id
        
        project_responses.append(ProjectListResponse(
            id=project.id,
            name=project.name,
            device_name=project.device_name,
            created_at=project.created_at,
            is_owner=is_owner,
            owner_email=project.owner.email if project.owner else None,
            member_count=len(project.members) + 1,  # +1 for owner
            updated_at=project.updated_at
        ))
    
    return project_responses


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
            
            # Get user objects (removed is_active filter - all accounts are active)
            users = db.query(User).filter(
                User.id.in_(list(project_users))
            ).offset(skip).limit(limit).all()
    
    return users


@router.get("/with-projects")
async def get_users_with_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get users with their project participations for Role Management"""
    
    print("🔥 DEBUG: get_users_with_projects called!")
    print(f"👤 Current user: {current_user.email if current_user else 'None'}")
    
    try:
        if current_user.role == UserRole.SYS_ADMIN:
            # Sys admin sees everyone 
            users = db.query(User).all()
            result = []
            
            for user in users:
                user_projects = []
                
                # For sys admin users, add all projects as admin
                if user.role == UserRole.SYS_ADMIN:
                    all_projects = db.query(Project).all()
                    for project in all_projects:
                        user_projects.append({
                            "id": project.id,
                            "name": project.name,
                            "role": "admin"
                        })
                else:
                    # Get projects where user is owner
                    owned_projects = db.query(Project).filter(Project.owner_id == user.id).all()
                    
                    # Get projects where user is member
                    member_projects = db.query(ProjectMember).filter(
                        ProjectMember.user_id == user.id
                    ).all()
                    
                    # Add owned projects (user is admin in these)
                    for project in owned_projects:
                        user_projects.append({
                            "id": project.id,
                            "name": project.name,
                            "role": "admin"
                        })
                    
                    # Add member projects
                    for membership in member_projects:
                        # Skip if already added as owner
                        if not any(p["id"] == membership.project_id for p in user_projects):
                            project = db.query(Project).filter(Project.id == membership.project_id).first()
                            if project:
                                user_projects.append({
                                    "id": project.id,
                                    "name": project.name,
                                    "role": membership.role.value
                                })
                
                result.append({
                    "id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "role": user.role.value,
                    "last_login": user.last_login,
                    "avatar_url": user.avatar_url,
                    "projects": user_projects
                })
            
            return result
        
        else:
            # Regular user sees only users from their projects (excluding sys admins)
            # Get projects where current user is owner or member
            owned_projects = db.query(Project).filter(Project.owner_id == current_user.id).all()
            
            # Get projects through membership
            member_project_ids = db.query(ProjectMember.project_id).filter(
                ProjectMember.user_id == current_user.id
            ).all()
            member_project_ids = [pid[0] for pid in member_project_ids]
            
            member_projects = []
            if member_project_ids:
                member_projects = db.query(Project).filter(
                    Project.id.in_(member_project_ids)
                ).all()
            
            project_ids = list(set([p.id for p in owned_projects + member_projects]))
            
            if not project_ids:
                return []
            
            # Get all users who participate in these projects (excluding sys admins)
            project_users = set()
            for project_id in project_ids:
                # Add project owner
                project = db.query(Project).filter(Project.id == project_id).first()
                if project and project.owner.role != UserRole.SYS_ADMIN:
                    project_users.add(project.owner_id)
                
                # Add project members (exclude sys admins)
                members = db.query(ProjectMember).join(User).filter(
                    ProjectMember.project_id == project_id,
                    User.role != UserRole.SYS_ADMIN
                ).all()
                for member in members:
                    project_users.add(member.user_id)
            
            # Get user objects (exclude sys admins)
            users = db.query(User).filter(
                User.id.in_(list(project_users)),
                User.role != UserRole.SYS_ADMIN  # Hide sys admins from regular users
            ).all()
            
            result = []
            for user in users:
                # Get user's projects that overlap with current user's projects
                user_projects = []
                
                # Check owned projects
                for project_id in project_ids:
                    project = db.query(Project).filter(
                        Project.id == project_id,
                        Project.owner_id == user.id
                    ).first()
                    if project:
                        user_projects.append({
                            "id": project.id,
                            "name": project.name,
                            "role": "admin"
                        })
                
                # Check member projects
                for project_id in project_ids:
                    membership = db.query(ProjectMember).filter(
                        ProjectMember.project_id == project_id,
                        ProjectMember.user_id == user.id
                    ).first()
                    if membership:
                        # Skip if already added as owner
                        if not any(p["id"] == project_id for p in user_projects):
                            project = db.query(Project).filter(Project.id == project_id).first()
                            if project:
                                user_projects.append({
                                    "id": project.id,
                                    "name": project.name,
                                    "role": membership.role.value
                                })
                
                result.append({
                    "id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "last_login": user.last_login,
                    "avatar_url": user.avatar_url,
                    "projects": user_projects
                    # Note: no "role" field for regular users - they don't see system roles
                })
            
            return result
        
    except Exception as e:
        import traceback
        print(f"Error in get_users_with_projects: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/me/statistics")
async def get_user_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get statistics for current user"""
    
    print("🔥 DEBUG: get_user_statistics called!")
    print(f"👤 Current user: {current_user.email if current_user else 'None'}")
    print(f"🎭 User role: {current_user.role.value if current_user else 'None'}")
    
    if current_user.role == UserRole.SYS_ADMIN:
        # Sys admin sees global statistics
        total_projects = db.query(Project).count()
        total_users = db.query(User).count()
        
        # Count all risk analyses in the system
        from ..models.risk_analysis import RiskAnalysis
        total_risk_analyses = db.query(RiskAnalysis).count()
        
        # Count active projects (projects with recent activity or risk analyses)
        active_projects = db.query(Project).count()  # For now, all projects are considered active
        
        return {
            "total_projects": total_projects,
            "total_users": total_users,
            "total_risk_analyses": total_risk_analyses,
            "active_projects": active_projects
        }
    else:
        # Regular user sees their own statistics
        # Import required models
        from ..models.risk_analysis import RiskAnalysis
        from ..models.project import ProjectMember
        
        # Count projects where user is owner or member
        owned_projects_count = db.query(Project).filter(Project.owner_id == current_user.id).count()
        member_projects_count = db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).count()
        user_projects = owned_projects_count + member_projects_count
        
        # Count risk analyses in projects where user is involved
        
        # Get projects where user is involved (owned + member)
        user_owned_project_ids = db.query(Project.id).filter(Project.owner_id == current_user.id).all()
        user_member_project_ids = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).all()
        
        all_user_project_ids = [p.id for p in user_owned_project_ids] + [p.project_id for p in user_member_project_ids]
        
        # Count risk analyses in these projects
        user_risk_analyses = db.query(RiskAnalysis).filter(RiskAnalysis.project_id.in_(all_user_project_ids)).count() if all_user_project_ids else 0
        
        return {
            "user_projects": user_projects,
            "user_risk_analyses": user_risk_analyses
        }


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific user"""
    # Check if current user can view this user
    if current_user.role != UserRole.SYS_ADMIN and current_user.id != user_id:
        # Regular users can only see users from their projects
        shared_projects = db.query(Project).join(ProjectMember, Project.id == ProjectMember.project_id).filter(
            ProjectMember.user_id == current_user.id
        ).all()
        
        shared_project_ids = [p.id for p in shared_projects]
        
        # Check if the requested user participates in any shared projects
        target_user_in_shared_projects = False
        
        if shared_project_ids:
            # Check if user owns any shared projects
            owned_shared = db.query(Project).filter(
                Project.owner_id == user_id,
                Project.id.in_(shared_project_ids)
            ).first()
            
            # Check if user is member in any shared projects
            member_shared = db.query(ProjectMember).filter(
                ProjectMember.user_id == user_id,
                ProjectMember.project_id.in_(shared_project_ids)
            ).first()
            
            target_user_in_shared_projects = owned_shared is not None or member_shared is not None
        
        if not target_user_in_shared_projects:
            raise HTTPException(status_code=403, detail="Not authorized to view this user")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return db_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a user"""
    # Only sys admin or the user themselves can update
    if current_user.role != UserRole.SYS_ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields
    for field, value in user_update.dict(exclude_unset=True).items():
        if field == "role" and current_user.role != UserRole.SYS_ADMIN:
            # Only sys admin can change roles
            continue
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Get current user info"""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update current user"""
    # Update fields (excluding role - users can't change their own role)
    for field, value in user_update.dict(exclude_unset=True).items():
        if field == "role":
            continue  # Users can't change their own role
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user
