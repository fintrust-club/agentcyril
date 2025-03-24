from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import secrets
import time

from app import models
from app.database import verify_admin_login

router = APIRouter()

# Simple in-memory token store - in production, use a proper JWT system
active_tokens = {}

def generate_token():
    """Generate a random token"""
    return secrets.token_hex(32)

def cleanup_expired_tokens():
    """Remove expired tokens"""
    current_time = time.time()
    expired = [token for token, details in active_tokens.items() 
               if current_time - details["created"] > 3600]  # 1 hour expiry
    
    for token in expired:
        del active_tokens[token]

@router.post("/login", response_model=models.AdminLoginResponse)
async def admin_login(login_data: models.AdminLoginRequest):
    """
    Admin login endpoint
    """
    try:
        # Verify credentials
        if verify_admin_login(login_data.username, login_data.password):
            # Generate a token
            token = generate_token()
            
            # Store token with timestamp
            active_tokens[token] = {
                "username": login_data.username,
                "created": time.time()
            }
            
            # Clean up expired tokens
            cleanup_expired_tokens()
            
            return models.AdminLoginResponse(
                success=True,
                token=token,
                message="Login successful"
            )
        else:
            return models.AdminLoginResponse(
                success=False,
                message="Invalid credentials"
            )
    
    except Exception as e:
        print(f"Error in admin login: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )

def verify_admin_token(token: str):
    """
    Verify that an admin token is valid
    """
    if token in active_tokens:
        # Check if token is expired
        if time.time() - active_tokens[token]["created"] > 3600:  # 1 hour expiry
            del active_tokens[token]
            return False
        return True
    return False 