from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ChatRequest(BaseModel):
    """
    Request model for chat endpoint
    """
    message: str = Field(..., description="The message sent by the user")


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


class ErrorResponse(BaseModel):
    """
    Standard error response
    """
    error: str
    detail: Optional[str] = None 