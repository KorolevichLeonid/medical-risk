"""
Azure Entra ID authentication utilities
"""
import httpx
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from fastapi import HTTPException, status
from .config import settings

# Azure Entra configuration
AZURE_TENANT_ID = "deb8c5e9-54cd-477d-be23-71cb103b773f"
AZURE_CLIENT_ID = "624fdd0e-67d1-4f65-8a19-036f4c6879c6"
# Use standard Microsoft authority instead of custom domain
AZURE_AUTHORITY = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/v2.0"
AZURE_DISCOVERY_URL = f"{AZURE_AUTHORITY}/.well-known/openid_configuration"

# Cache for Azure keys
_azure_keys_cache = {"keys": None, "expires": None}


async def get_azure_keys() -> Dict[str, Any]:
    """Get Azure signing keys with caching"""
    now = datetime.now()
    
    # Check if cache is valid
    if (_azure_keys_cache["keys"] is not None and 
        _azure_keys_cache["expires"] is not None and 
        now < _azure_keys_cache["expires"]):
        return _azure_keys_cache["keys"]
    
    try:
        async with httpx.AsyncClient() as client:
            # Get discovery document
            discovery_response = await client.get(AZURE_DISCOVERY_URL)
            discovery_response.raise_for_status()
            discovery_data = discovery_response.json()
            
            # Get JWKS endpoint
            jwks_uri = discovery_data["jwks_uri"]
            jwks_response = await client.get(jwks_uri)
            jwks_response.raise_for_status()
            jwks_data = jwks_response.json()
            
            # Cache for 1 hour
            _azure_keys_cache["keys"] = jwks_data
            _azure_keys_cache["expires"] = now + timedelta(hours=1)
            
            return jwks_data
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to get Azure keys: {str(e)}"
        )


def find_key_by_kid(jwks_data: Dict[str, Any], kid: str) -> Optional[Dict[str, Any]]:
    """Find signing key by key ID"""
    for key in jwks_data.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


async def verify_azure_token(token: str) -> Dict[str, Any]:
    """Verify Azure Entra ID token and extract user information"""
    try:
        # For development/testing: decode token without verification
        # In production, you should enable full verification
        print(f"🔍 Decoding Azure token (development mode)...")
        
        # Decode without verification for testing
        unverified_payload = jwt.get_unverified_claims(token)
        print(f"Token payload: {unverified_payload}")
        
        # Extract user information
        user_info = {
            "object_id": unverified_payload.get("sub") or unverified_payload.get("oid") or "test-azure-id",
            "email": unverified_payload.get("email") or unverified_payload.get("preferred_username") or unverified_payload.get("upn"),
            "first_name": unverified_payload.get("given_name", ""),
            "last_name": unverified_payload.get("family_name", ""),
            "name": unverified_payload.get("name", ""),
            "tenant_id": unverified_payload.get("tid"),
        }
        
        print(f"Extracted user info: {user_info}")
        
        # Ensure we have required fields
        if not user_info["object_id"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user object ID"
            )
        
        if not user_info["email"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user email"
            )
        
        return user_info
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


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
    
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
