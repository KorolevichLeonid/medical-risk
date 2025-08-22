"""
Mock Azure authentication for development/testing
This bypasses Azure token verification for local development
"""

from datetime import datetime, timedelta
from typing import Dict, Any
from jose import jwt
from fastapi import HTTPException, status
from .config import settings

async def verify_azure_token_mock(token: str) -> Dict[str, Any]:
    """Mock Azure token verification for development"""
    print(f"🔧 Mock Azure token verification (development mode)")
    print(f"Token length: {len(token)}")
    
    try:
        # Try to decode without verification
        unverified_payload = jwt.get_unverified_claims(token)
        print(f"Token payload keys: {list(unverified_payload.keys())}")
        
        # Extract user information with better fallbacks
        email = (unverified_payload.get("email") or 
                unverified_payload.get("preferred_username") or 
                unverified_payload.get("upn") or 
                unverified_payload.get("unique_name"))
        
        object_id = (unverified_payload.get("oid") or 
                    unverified_payload.get("sub") or 
                    f"mock-{hash(email or 'fallback')}")
        
        first_name = unverified_payload.get("given_name") or ""
        last_name = unverified_payload.get("family_name") or ""
        
        # If names are empty, try to parse from 'name' field
        if not first_name and not last_name:
            full_name = unverified_payload.get("name", "")
            if full_name:
                name_parts = full_name.split(" ", 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        user_info = {
            "object_id": object_id,
            "email": email,
            "first_name": first_name or "User",
            "last_name": last_name or "Azure",
            "name": unverified_payload.get("name", f"{first_name} {last_name}"),
            "tenant_id": unverified_payload.get("tid"),
        }
        
        print(f"✅ Extracted user info: {user_info}")
        
        # Validate required fields
        if not user_info["email"]:
            print("⚠️  No email found, using fallback")
            user_info["email"] = "fallback@example.com"
        
        return user_info
        
    except Exception as e:
        print(f"❌ Token decode error: {e}")
        print("Using complete fallback user data")
        # Complete fallback
        return {
            "object_id": "mock-fallback-user",
            "email": "fallback@example.com", 
            "first_name": "Fallback",
            "last_name": "User",
            "name": "Fallback User",
            "tenant_id": "mock-tenant"
        }


def create_local_token(user_data: Dict[str, Any]) -> str:
    """Create a local JWT token for the authenticated user"""
    to_encode = {
        "sub": user_data["email"],
        "object_id": user_data["object_id"],
        "exp": datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def verify_local_token(token: str) -> Dict[str, Any]:
    """Verify local JWT token"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        object_id: str = payload.get("object_id")
        
        if email is None or object_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return {"email": email, "object_id": object_id}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
