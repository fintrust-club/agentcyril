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
            print(f"Attempting to update profile in Supabase: {data.get('id')}")
            profile_id = data.get("id")
            if profile_id:
                # Update existing profile
                print(f"Updating existing profile with ID: {profile_id}")
                response = supabase.table("profiles").update(data).eq("id", profile_id).execute()
                print(f"Supabase update response: {response.data}")
            else:
                # Create new profile
                print("Creating new profile in Supabase")
                response = supabase.table("profiles").insert(data).execute()
                print(f"Supabase insert response: {response.data}")
            
            if response.data:
                print("Successfully updated profile in Supabase")
                return response.data
            else:
                print("No data returned from Supabase update")
        else:
            print("Supabase client not available, using in-memory storage")
        
        # Update in-memory profile if Supabase fails or is not available
        in_memory_profile.update(data)
        print("Updated in-memory profile as fallback")
        return [in_memory_profile]
    except Exception as e:
        print(f"Error updating profile data: {e}")
        # Update in-memory profile as fallback
        in_memory_profile.update(data)
        print("Updated in-memory profile after error")
        return [in_memory_profile]

def log_chat_message(message, sender, response=None, visitor_id="anonymous", visitor_name=None):
    """
    Log a chat message to Supabase or in-memory storage
    """
    try:
        # Ensure visitor_id is not None or empty
        if not visitor_id or visitor_id.strip() == "":
            visitor_id = "anonymous"
            print("Warning: Empty visitor_id provided, using 'anonymous' instead")
        
        # Create message data
        data = {
            "message": message,
            "sender": sender,
            "response": response,
            "visitor_id": visitor_id,
            "visitor_name": visitor_name,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        print(f"Logging chat message for visitor: {visitor_id}, name: {visitor_name}")
        
        if supabase:
            # Log the data being sent to Supabase for debugging
            print(f"Sending to Supabase: {data}")
            
            try:
                response = supabase.table("messages").insert(data).execute()
                
                if response.data:
                    print(f"Successfully logged message to Supabase. Response: {response.data}")
                    return response.data
                else:
                    print(f"No data returned from Supabase insert. Response: {response}")
            except Exception as supabase_error:
                print(f"Supabase insert error: {supabase_error}")
                print("Falling back to in-memory storage due to Supabase error")
        else:
            print("Supabase client not available, using in-memory storage")
        
        # Add to in-memory storage if Supabase fails or is not available
        message_with_id = {**data, "id": str(len(in_memory_messages) + 1)}
        in_memory_messages.append(message_with_id)
        print("Added message to in-memory storage")
        return [message_with_id]
    except Exception as e:
        print(f"Error logging chat message: {e}")
        try:
            # Try to add to in-memory storage as fallback
            message_with_id = {
                "message": message,
                "sender": sender,
                "response": response,
                "visitor_id": visitor_id or "anonymous",
                "visitor_name": visitor_name,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "id": str(len(in_memory_messages) + 1)
            }
            in_memory_messages.append(message_with_id)
            print("Added message to in-memory storage after error")
            return [message_with_id]
        except Exception as fallback_error:
            print(f"Error in fallback storage: {fallback_error}")
            return None

def get_chat_history(limit=50, visitor_id=None):
    """
    Get chat history from Supabase or in-memory storage
    """
    try:
        print(f"Getting chat history, limit: {limit}, visitor_id: {visitor_id}")
        
        if supabase:
            try:
                query = supabase.table("messages").select("*").order("timestamp", desc=True)
                
                # Filter by visitor ID if provided
                if visitor_id:
                    print(f"Filtering chat history for visitor: {visitor_id}")
                    query = query.eq("visitor_id", visitor_id)
                
                response = query.limit(limit).execute()
                
                if response.data:
                    print(f"Retrieved {len(response.data)} messages from Supabase")
                    # DEBUG: Print first message to verify visitor_id is present
                    if response.data and len(response.data) > 0:
                        print(f"First message visitor_id: {response.data[0].get('visitor_id', 'MISSING')}")
                    return response.data
                else:
                    print("No chat history found in Supabase")
            except Exception as supabase_error:
                print(f"Error retrieving chat history from Supabase: {supabase_error}")
                print("Falling back to in-memory storage")
        else:
            print("Supabase client not available, using in-memory storage")
        
        # Return in-memory messages if Supabase fails or is not available
        filtered_messages = in_memory_messages
        if visitor_id:
            filtered_messages = [msg for msg in in_memory_messages if msg.get("visitor_id") == visitor_id]
            print(f"Filtered in-memory messages for visitor {visitor_id}: found {len(filtered_messages)} messages")
        
        sorted_messages = sorted(filtered_messages, key=lambda x: x.get("timestamp", ""), reverse=True)
        return sorted_messages[:limit]
    except Exception as e:
        print(f"Error getting chat history: {e}")
        return []

def verify_admin_login(username, password):
    """
    Verify admin login credentials against the database
    """
    try:
        if supabase:
            response = supabase.table("admin_users").select("*").eq("username", username).limit(1).execute()
            
            if response.data and len(response.data) > 0:
                user = response.data[0]
                # In a real application, use a proper password hashing library
                if user["password_hash"] == password:
                    print(f"Admin login successful for user: {username}")
                    return True
            
            print(f"Admin login failed for user: {username}")
            return False
        else:
            print("Supabase client not available, using default admin check")
            # Fallback for demo purposes - in production, always use the database
            return username == "admin" and password == "admin123"
    except Exception as e:
        print(f"Error verifying admin login: {e}")
        # Fallback for demo purposes
        return username == "admin" and password == "admin123" 