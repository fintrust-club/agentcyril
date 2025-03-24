from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ChatRequest(BaseModel):
    """
    Request model for chat endpoint
    """
    message: str = Field(..., description="The message sent by the user")
    visitor_id: str = Field(..., description="Unique identifier for the visitor")
    visitor_name: Optional[str] = Field(None, description="Optional name for the visitor")


class ChatResponse(BaseModel):
    """
    Response model for chat endpoint
    """
    response: str = Field(..., description="The response from the AI assistant")
    query_time_ms: float = Field(..., description="Time taken to process the query in milliseconds")


class ChatHistoryItem(BaseModel):
    """
    Model for a single chat history item
    """
    id: str
    message: str
    sender: str
    response: Optional[str] = None
    visitor_id: str
    visitor_name: Optional[str] = None
    timestamp: datetime


class ChatHistoryResponse(BaseModel):
    """
    Response model for chat history endpoint
    """
    history: List[ChatHistoryItem] = Field(default_factory=list)
    count: int


class ProfileData(BaseModel):
    """
    Model for profile data
    """
    id: Optional[str] = None
    bio: str
    skills: str
    experience: str
    projects: str
    interests: str
    updated_at: Optional[datetime] = None


class AdminLoginRequest(BaseModel):
    """
    Request model for admin login
    """
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    """
    Response model for admin login
    """
    success: bool
    token: Optional[str] = None
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    """
    Standard error response
    """
    error: str
    detail: Optional[str] = None 