import time
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app import models
from app.database import log_chat_message, get_chat_history
from app.embeddings import query_vector_db, generate_ai_response

router = APIRouter()

@router.post("/", response_model=models.ChatResponse)
async def chat(chat_request: models.ChatRequest):
    """
    Process a chat message and return an AI response
    """
    start_time = time.time()
    
    try:
        # Query the vector database
        search_results = query_vector_db(chat_request.message)
        
        # Generate AI response
        response = generate_ai_response(chat_request.message, search_results)
        
        # Log the chat message
        log_chat_message(chat_request.message, "user", response)
        
        # Calculate query time
        query_time_ms = (time.time() - start_time) * 1000
        
        return models.ChatResponse(
            response=response,
            query_time_ms=query_time_ms
        )
    
    except Exception as e:
        print(f"Error processing chat: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat message: {str(e)}"
        )

@router.get("/history", response_model=models.ChatHistoryResponse)
async def get_chat_history_endpoint(limit: int = 50):
    """
    Get chat history
    """
    try:
        history = get_chat_history(limit=limit)
        
        # Convert the history to the expected format
        formatted_history = []
        for item in history:
            formatted_history.append(models.ChatHistoryItem(
                id=item["id"],
                message=item["message"],
                sender=item["sender"],
                response=item.get("response"),
                timestamp=item["timestamp"]
            ))
        
        return models.ChatHistoryResponse(
            history=formatted_history,
            count=len(formatted_history)
        )
    
    except Exception as e:
        print(f"Error getting chat history: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get chat history: {str(e)}"
        ) 