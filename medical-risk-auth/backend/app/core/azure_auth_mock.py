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
        
        # Извлекаем настоящий email для Azure B2C локальных аккаунтов.
        # Поле preferred_username / upn содержит GUID вида:
        #   b19a9a9f-b64c-48c4-8d99-490f46bef617@tenant.onmicrosoft.com
        # Настоящий email хранится в поле 'emails' (массив) или 'email'.

        # 1. Поле 'emails' — массив, специфичный для Azure B2C (самый надёжный)
        emails_list = unverified_payload.get("emails")
        if emails_list and isinstance(emails_list, list) and len(emails_list) > 0:
            clean_email = emails_list[0]
            print(f"📧 Email из поля 'emails': {clean_email}")

        # 2. Прямое поле 'email'
        elif unverified_payload.get("email"):
            clean_email = unverified_payload.get("email")
            print(f"📧 Email из поля 'email': {clean_email}")

        # 3. preferred_username / upn / unique_name — только если это НЕ GUID
        else:
            for field in ("preferred_username", "upn", "unique_name"):
                raw = unverified_payload.get(field, "")
                if not raw:
                    continue
                local_part = raw.split("@")[0] if "@" in raw else raw
                # GUID содержит ровно 4 дефиса в формате 8-4-4-4-12
                if local_part.count("-") == 4 and len(local_part) == 36:
                    print(f"⚠️  Поле '{field}' содержит GUID, пропускаем: {raw}")
                    continue
                clean_email = raw
                print(f"📧 Email из поля '{field}': {clean_email}")
                break
            else:
                clean_email = None

        object_id = (unverified_payload.get("oid") or
                    unverified_payload.get("sub") or
                    f"mock-{hash(clean_email or 'fallback')}")

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
            "email": clean_email,
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
