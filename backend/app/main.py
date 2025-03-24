from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

from app.routes import chatbot, profiles

# Load environment variables
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    print("Warning: OPENAI_API_KEY environment variable not set")

# Create FastAPI app
app = FastAPI(
    title="Agent Ciril API",
    description="API for the Agent Ciril interactive portfolio",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with actual frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chatbot.router, prefix="/chat", tags=["chat"])
app.include_router(profiles.router, prefix="/profile", tags=["profile"])

@app.get("/")
async def root():
    return {"message": "Welcome to Agent Ciril API. See /docs for API documentation."}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 