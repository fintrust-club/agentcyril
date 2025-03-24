import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase environment variables. Make sure SUPABASE_URL and SUPABASE_KEY are set in .env file.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_profile_data():
    """
    Get the profile data from Supabase
    """
    try:
        response = supabase.table("profiles").select("*").limit(1).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error fetching profile data: {e}")
        return None

def update_profile_data(data):
    """
    Update the profile data in Supabase
    """
    try:
        profile_id = data.get("id")
        if profile_id:
            # Update existing profile
            response = supabase.table("profiles").update(data).eq("id", profile_id).execute()
        else:
            # Create new profile
            response = supabase.table("profiles").insert(data).execute()
        return response.data
    except Exception as e:
        print(f"Error updating profile data: {e}")
        return None

def log_chat_message(message, sender, response=None):
    """
    Log a chat message to Supabase
    """
    try:
        data = {
            "message": message,
            "sender": sender,
            "response": response,
            "timestamp": "now()"  # Use Supabase's now() function
        }
        response = supabase.table("messages").insert(data).execute()
        return response.data
    except Exception as e:
        print(f"Error logging chat message: {e}")
        return None

def get_chat_history(limit=50):
    """
    Get chat history from Supabase
    """
    try:
        response = supabase.table("messages").select("*").order("timestamp", desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching chat history: {e}")
        return [] 