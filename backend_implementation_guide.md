# Backend Implementation Guide for Multi-User Platform

## Overview

This document outlines the necessary changes to transform the current single-user API into a multi-user platform where each user can have their own chatbot and profile.

## Key Changes Required

### 1. Database Models Updates

The models.py file needs to be updated to support the new database schema:

```python
# Update these models to match the new schema
class ChatbotModel(BaseModel):
    id: Optional[str] = None
    user_id: str
    name: str
    description: Optional[str] = None
    is_public: bool = True
    configuration: Optional[Dict[str, Any]] = None
    public_url_slug: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ProfileData(BaseModel):
    id: Optional[str] = None
    user_id: str
    name: Optional[str] = None
    location: Optional[str] = None
    bio: str
    skills: str
    experience: str
    interests: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ChatRequest(BaseModel):
    message: str
    visitor_id: str
    visitor_name: Optional[str] = None
    chatbot_id: str  # New field to specify which chatbot to interact with
```

### 2. Database Access Functions

Update database.py to support multi-user operations:

```python
def get_profile_data(user_id=None):
    """
    Get the profile data from Supabase
    If user_id is provided, get that specific user's profile
    Otherwise, return an error
    """
    try:
        if not user_id:
            raise ValueError("User ID is required to fetch profile data")
            
        if supabase:
            response = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            else:
                return None
        return None
    except Exception as e:
        logging.error(f"Error fetching profile data: {e}")
        return None

def get_chatbot(chatbot_id=None, slug=None, user_id=None):
    """
    Get a chatbot by either ID, slug, or the default one for a user
    """
    try:
        if not chatbot_id and not slug and not user_id:
            raise ValueError("Either chatbot_id, slug, or user_id must be provided")
            
        if supabase:
            query = supabase.table("chatbots").select("*")
            
            if chatbot_id:
                query = query.eq("id", chatbot_id)
            elif slug:
                query = query.eq("public_url_slug", slug)
            elif user_id:
                # Get the default/first chatbot for this user
                query = query.eq("user_id", user_id).order("created_at", desc=False)
                
            response = query.execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            else:
                return None
        return None
    except Exception as e:
        logging.error(f"Error fetching chatbot: {e}")
        return None

def log_chat_message(message, sender, chatbot_id, response=None, visitor_id=None, visitor_name=None):
    """
    Log a chat message to the database with the new schema
    """
    try:
        # First ensure the visitor exists
        visitor_record = None
        
        if visitor_id and supabase:
            # Check if visitor exists
            visitor_response = supabase.table("visitors").select("*").eq("visitor_id", visitor_id).execute()
            
            if visitor_response.data and len(visitor_response.data) > 0:
                visitor_record = visitor_response.data[0]
                # Update last_seen
                supabase.table("visitors").update({"last_seen": datetime.utcnow().isoformat()}).eq("id", visitor_record["id"]).execute()
            else:
                # Create new visitor
                visitor_data = {
                    "visitor_id": visitor_id,
                    "name": visitor_name,
                    "first_seen": datetime.utcnow().isoformat(),
                    "last_seen": datetime.utcnow().isoformat()
                }
                visitor_response = supabase.table("visitors").insert(visitor_data).execute()
                if visitor_response.data and len(visitor_response.data) > 0:
                    visitor_record = visitor_response.data[0]
        
        # Now log the message
        if supabase:
            message_data = {
                "message": message,
                "chatbot_id": chatbot_id,
                "response": response,
                "created_at": datetime.utcnow().isoformat(),
                "is_read": False
            }
            
            if visitor_record:
                message_data["visitor_id"] = visitor_record["id"]
                
            response = supabase.table("messages").insert(message_data).execute()
            return response.data
        return None
    except Exception as e:
        logging.error(f"Error logging chat message: {e}")
        return None
```

### 3. API Routes Updates

Update main.py and routes files to support multi-user operations:

#### Chat Route Update

```python
@router.post("/chat", response_model=models.ChatResponse)
async def chat(request: models.ChatRequest):
    """
    Handle a chat request from the frontend
    """
    start_time = time.time()
    
    try:
        # Get the chatbot the user is talking to
        chatbot = get_chatbot(chatbot_id=request.chatbot_id)
        if not chatbot:
            raise HTTPException(status_code=404, detail="Chatbot not found")
            
        # Get the owner's profile
        profile_data = get_profile_data(user_id=chatbot["user_id"])
        if not profile_data:
            raise HTTPException(status_code=404, detail="Profile not found for chatbot owner")
        
        # Rest of your code for generating response
        # ...
        
        # Log the message to the database with the chatbot ID
        log_chat_message(
            message=request.message, 
            sender="user", 
            chatbot_id=chatbot["id"],
            response=ai_response, 
            visitor_id=request.visitor_id, 
            visitor_name=request.visitor_name
        )
        
        # Return response
        return models.ChatResponse(
            response=ai_response,
            query_time_ms=query_time_ms
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error processing chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

#### Profile Route Update

```python
@router.get("/", response_model=models.ProfileData)
async def get_profile(
    user_id: Optional[str] = Query(None, description="Specific user profile to retrieve"),
    current_user = Depends(get_current_user)
):
    """
    Get a profile - either the current user's profile or a specific user's public profile
    """
    try:
        # If no user_id specified, use the authenticated user's ID
        target_user_id = user_id or current_user.id
        
        profile_data = get_profile_data(user_id=target_user_id)
        if not profile_data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        return models.ProfileData(**profile_data)
    
    except Exception as e:
        logging.error(f"Error getting profile data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

#### New Chatbot Routes

```python
@router.get("/chatbots", response_model=List[models.ChatbotModel])
async def get_user_chatbots(current_user = Depends(get_current_user)):
    """
    Get all chatbots for the authenticated user
    """
    try:
        if supabase:
            response = supabase.table("chatbots").select("*").eq("user_id", current_user.id).execute()
            
            if response.data:
                return [models.ChatbotModel(**chatbot) for chatbot in response.data]
            return []
    except Exception as e:
        logging.error(f"Error fetching user chatbots: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chatbots", response_model=models.ChatbotModel)
async def create_chatbot(chatbot: models.ChatbotModel, current_user = Depends(get_current_user)):
    """
    Create a new chatbot for the authenticated user
    """
    try:
        # Ensure user_id is set to the authenticated user
        chatbot_data = chatbot.dict()
        chatbot_data["user_id"] = current_user.id
        
        # Generate a unique slug if not provided
        if not chatbot_data.get("public_url_slug"):
            base_slug = slugify(chatbot_data["name"])
            
            # Call the Supabase function to generate a unique slug
            slug_response = supabase.rpc("generate_unique_slug", {"base_slug": base_slug}).execute()
            if slug_response.data:
                chatbot_data["public_url_slug"] = slug_response.data
            else:
                # Fallback with timestamp
                chatbot_data["public_url_slug"] = f"{base_slug}-{int(time.time())}"
        
        # Add timestamps
        now = datetime.utcnow().isoformat()
        chatbot_data["created_at"] = now
        chatbot_data["updated_at"] = now
        
        # Insert into database
        if supabase:
            response = supabase.table("chatbots").insert(chatbot_data).execute()
            
            if response.data and len(response.data) > 0:
                return models.ChatbotModel(**response.data[0])
                
        raise HTTPException(status_code=500, detail="Failed to create chatbot")
    except Exception as e:
        logging.error(f"Error creating chatbot: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

### 4. Authentication Middleware

Add authentication middleware to protect user-specific routes:

```python
# In a new file auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pydantic import BaseModel
import os

security = HTTPBearer()

class User(BaseModel):
    id: str
    email: str

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify the JWT token and return the user
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token, 
            os.getenv("SUPABASE_JWT_SECRET"), 
            algorithms=["HS256"]
        )
        
        # The payload contains the user's ID in the 'sub' field
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        # Get the user email if available
        email = payload.get("email", "")
        
        return User(id=user_id, email=email)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

## Implementation Steps

1. **Database Schema Migration**:
   - Run the new_schema.sql file to create the new tables
   - Run the migration_scripts.sql file to migrate existing data

2. **Code Updates**:
   - Update models.py with the new data models
   - Update database.py with multi-user support functions
   - Create auth.py for authentication middleware
   - Update routes in main.py and route files

3. **Testing**:
   - Test user registration and authentication flow
   - Test profile creation and updates
   - Test chatbot creation and management
   - Test chat functionality with specific chatbots

4. **Deployment**:
   - Deploy database schema updates
   - Deploy updated backend code
   - Monitor for any issues during transition 