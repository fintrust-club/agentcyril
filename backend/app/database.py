import os
from supabase import create_client, Client
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Default profile data to use if DB is not available
DEFAULT_PROFILE = {
    "bio": "I am a software engineer with a passion for building AI and web applications. I specialize in full-stack development and have experience across the entire development lifecycle.",
    "skills": "JavaScript, TypeScript, React, Node.js, Python, FastAPI, PostgreSQL, ChromaDB, Supabase, Next.js, TailwindCSS",
    "experience": "5+ years of experience in full-stack development, with a focus on building AI-powered applications and responsive web interfaces.",
    "projects": "AI-powered portfolio system, real-time analytics dashboard, natural language processing application",
    "interests": "AI, machine learning, web development, reading sci-fi, hiking"
}

# Initialize Supabase client or None if connection fails
supabase = None
try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase connection initialized")
    else:
        print("Warning: Missing Supabase environment variables. Using in-memory storage.")
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    print("Using in-memory storage instead.")

# In-memory storage as fallback
in_memory_profile = DEFAULT_PROFILE.copy()
in_memory_messages = []

def get_profile_data():
    """
    Get the profile data from Supabase or in-memory storage
    """
    try:
        if supabase:
            response = supabase.table("profiles").select("*").limit(1).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
        
        # Return in-memory profile if Supabase fails or is not available
        return in_memory_profile
    except Exception as e:
        print(f"Error fetching profile data: {e}")
        return in_memory_profile

def update_profile_data(data):
    """
    Update the profile data in Supabase or in-memory storage
    """
    try:
        if supabase:
            profile_id = data.get("id")
            if profile_id:
                # Update existing profile
                response = supabase.table("profiles").update(data).eq("id", profile_id).execute()
            else:
                # Create new profile
                response = supabase.table("profiles").insert(data).execute()
            if response.data:
                return response.data
        
        # Update in-memory profile if Supabase fails or is not available
        in_memory_profile.update(data)
        return [in_memory_profile]
    except Exception as e:
        print(f"Error updating profile data: {e}")
        # Update in-memory profile as fallback
        in_memory_profile.update(data)
        return [in_memory_profile]

def log_chat_message(message, sender, response=None):
    """
    Log a chat message to Supabase or in-memory storage
    """
    try:
        data = {
            "message": message,
            "sender": sender,
            "response": response,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        if supabase:
            response = supabase.table("messages").insert(data).execute()
            if response.data:
                return response.data
        
        # Add to in-memory storage if Supabase fails or is not available
        message_with_id = {**data, "id": str(len(in_memory_messages) + 1)}
        in_memory_messages.append(message_with_id)
        return [message_with_id]
    except Exception as e:
        print(f"Error logging chat message: {e}")
        # Add to in-memory storage as fallback
        message_with_id = {**data, "id": str(len(in_memory_messages) + 1)}
        in_memory_messages.append(message_with_id)
        return [message_with_id]

def get_chat_history(limit=50):
    """
    Get chat history from Supabase or in-memory storage
    """
    try:
        if supabase:
            response = supabase.table("messages").select("*").order("timestamp", desc=True).limit(limit).execute()
            if response.data:
                return response.data
        
        # Return in-memory messages if Supabase fails or is not available
        sorted_messages = sorted(in_memory_messages, key=lambda x: x.get("timestamp", ""), reverse=True)
        return sorted_messages[:limit]
    except Exception as e:
        print(f"Error fetching chat history: {e}")
        # Return in-memory messages as fallback
        sorted_messages = sorted(in_memory_messages, key=lambda x: x.get("timestamp", ""), reverse=True)
        return sorted_messages[:limit] 