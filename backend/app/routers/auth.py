"""
Authentication router for Azure Entra ID
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models.user import User, UserRole
from ..schemas.user import UserResponse
from ..schemas.auth import Token, AzureTokenLogin
from ..core.azure_auth_mock import verify_azure_token_mock, create_local_token, verify_local_token
from ..core.config import settings
from ..core.logging import log_user_login

router = APIRouter()
security = HTTPBearer()


def get_user_by_email(db: Session, email: str) -> User:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()


def get_user_by_azure_id(db: Session, azure_object_id: str) -> User:
    """Get user by Azure object ID"""
    return db.query(User).filter(User.azure_object_id == azure_object_id).first()


def create_user_from_azure(db: Session, azure_user_info: dict) -> User:
    """Create a new user from Azure user information"""
    # Parse name if first_name/last_name are empty
    if not azure_user_info["first_name"] or not azure_user_info["last_name"]:
        name_parts = azure_user_info.get("name", "").split(" ", 1)
        first_name = name_parts[0] if name_parts else "User"
        last_name = name_parts[1] if len(name_parts) > 1 else ""
    else:
        first_name = azure_user_info["first_name"]
        last_name = azure_user_info["last_name"]
    
    user = User(
        email=azure_user_info["email"],
        azure_object_id=azure_user_info["object_id"],
        first_name=first_name,
        last_name=last_name,
        role=UserRole.USER,  # Default role for new users
        is_active=True,
        is_verified=True,  # Verified through Azure
        language="en"
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


async def get_current_user(
    credentials = Depends(security), 
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from local token"""
    token = credentials.credentials
    token_data = verify_local_token(token)
    
    # Try to find user by email first, then by Azure object ID
    user = get_user_by_email(db, email=token_data["email"])
    if not user:
        user = get_user_by_azure_id(db, azure_object_id=token_data["object_id"])
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def check_user_role(required_roles: list = None):
    """Dependency to check if user has required role"""
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if required_roles and current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker


@router.post("/azure-login", response_model=Token)
async def azure_login(
    request: Request, 
    login_data: AzureTokenLogin, 
    db: Session = Depends(get_db)
):
    """Login with Azure Entra ID token"""
    
    try:
        print(f"🚀 Azure login endpoint called")
        print(f"Token received: {login_data.azure_token[:50]}..." if len(login_data.azure_token) > 50 else login_data.azure_token)
        
        # Verify Azure token and extract user info
        print("🔐 Verifying Azure token...")
        azure_user_info = await verify_azure_token_mock(login_data.azure_token)
        print(f"✅ Azure user info verified: {azure_user_info}")
        
        # Try to find existing user
        print(f"👤 Looking for user with Azure ID: {azure_user_info['object_id']}")
        user = get_user_by_azure_id(db, azure_user_info["object_id"])
        
        if not user:
            print(f"📧 Looking for user with email: {azure_user_info['email']}")
            user = get_user_by_email(db, azure_user_info["email"])
            if user:
                print("🔄 Updating existing user with Azure object ID")
                # Update existing user with Azure object ID
                user.azure_object_id = azure_user_info["object_id"]
                db.commit()
            else:
                print("➕ Creating new user from Azure info")
                # Create new user
                user = create_user_from_azure(db, azure_user_info)
        else:
            print("✅ Found existing user by Azure ID")
        
        # Check if user is active
        if not user.is_active:
            print(f"❌ User {user.email} is not active")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is deactivated. Please contact administrator.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last login
        print("⏰ Updating last login time")
        user.last_login = datetime.now()
        db.commit()
        
        # Log user login
        print("📝 Logging user login")
        log_user_login(db=db, user=user, request=request)
        
        # Create local token
        print("🎫 Creating local token")
        access_token = create_local_token({
            "email": user.email,
            "object_id": user.azure_object_id
        })
        
        print(f"✅ Login successful for user: {user.email}")
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException as e:
        print(f"❌ HTTP Exception in azure_login: {e.detail}")
        raise e
    except Exception as e:
        print(f"❌ Unexpected error in azure_login: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user


@router.post("/logout")
async def logout():
    """Logout endpoint (client-side token removal)"""
    return {"message": "Successfully logged out"}
