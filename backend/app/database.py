import os
from supabase import create_client, Client
from dotenv import load_dotenv
import time
import json
import uuid
import logging
import traceback
from typing import List, Dict

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Default profile data to use if DB is not available
DEFAULT_PROFILE = {
    "name": "John Doe",
    "bio": "I am John, a software engineer with a passion for building AI and web applications. I specialize in full-stack development and have experience across the entire development lifecycle.",
    "skills": "JavaScript, TypeScript, React, Node.js, Python, FastAPI, PostgreSQL, ChromaDB, Supabase, Next.js, TailwindCSS",
    "experience": "5+ years of experience in full-stack development, with a focus on building AI-powered applications and responsive web interfaces.",
    "interests": "AI, machine learning, web development, reading sci-fi, hiking",
    "project_list": []
}

# Initialize Supabase client or None if connection fails
supabase = None

# Try to connect to Supabase
try:
    logger.info(f"Connecting to Supabase at {SUPABASE_URL[:20]}...")
    if SUPABASE_URL and SUPABASE_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Successfully connected to Supabase")
except Exception as e:
    logger.error(f"Failed to connect to Supabase: {e}")
    supabase = None

# Load the in-memory profile from the backup file if it exists
try:
    if os.path.exists('profile_backup.json'):
        with open('profile_backup.json', 'r') as f:
            in_memory_profile = json.load(f)
            logger.info(f"Loaded profile from backup file with name: {in_memory_profile.get('name', 'unknown')}")
    else:
        in_memory_profile = DEFAULT_PROFILE.copy()
        logger.info(f"No backup file found, using default profile with name: {in_memory_profile.get('name', 'unknown')}")
        # Save the default profile to the backup file
        with open('profile_backup.json', 'w') as f:
            json.dump(in_memory_profile, f, indent=2)
            logger.info("Created initial profile backup file")
except Exception as e:
    logger.error(f"Error loading profile from backup: {e}")
    in_memory_profile = DEFAULT_PROFILE.copy()
    logger.warning("Using default profile after backup load error")

in_memory_messages = []
in_memory_chatbots = []

def get_profile_data(user_id=None):
    """Get profile data from Supabase or fallback storage
    If user_id is provided, try to get the profile for that user
    otherwise return a default profile or the first profile found.
    """
    try:
        # If a user_id is provided, attempt to fetch from Supabase
        if supabase and user_id:
            logger.info(f"Fetching profile for user_id: {user_id}")

            # First check in profiles table
            try:
                profiles_response = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
                logger.info(f"Profile query response: {profiles_response.data}")
            
                if profiles_response.data and len(profiles_response.data) > 0:
                    # Found existing profile
                    profile = profiles_response.data[0]
                    logger.info(f"Found profile for user_id {user_id}: {profile['id']}")
                    
                    # Convert projects JSON string to project_list for compatibility
                    if "projects" in profile and profile["projects"]:
                        try:
                            logger.info(f"Converting projects JSON to project_list: {profile['projects'][:100]}...")
                            profile["project_list"] = json.loads(profile["projects"])
                        except Exception as json_error:
                            logger.error(f"Error parsing projects JSON: {json_error}")
                            profile["project_list"] = []
                    else:
                        profile["project_list"] = []
                    
                    return profile
                else:
                    # No profile found for this user, create one
                    logger.info(f"No profile found for user_id {user_id}, creating new profile")
                    
                    # Create a new default profile for this user
                    new_profile = DEFAULT_PROFILE.copy()
                    new_profile.update({
                        "user_id": user_id,
                        "created_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                        "updated_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                        "projects": "[]",  # Empty JSON array as string
                        "project_list": []  # Empty list for project_list field
                    })
                    
                    # Try to create the profile in Supabase
                    try:
                        # First check if user exists in users table, if not create it
                        user_response = supabase.table("users").select("id").eq("id", user_id).execute()
                        if not user_response.data:
                            logger.info(f"User {user_id} not found in users table, creating it")
                            # Create user in users table
                            user_data = {
                                "id": user_id,
                                "username": f"user_{user_id[:8]}",
                                "created_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                                "updated_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                            }
                            supabase.table("users").upsert(user_data).execute()
                        
                        # Try creating profile with both fields
                        try:
                            profile_response = supabase.table("profiles").insert(new_profile).execute()
                            
                            if profile_response.data and len(profile_response.data) > 0:
                                logger.info(f"Created new profile for user_id {user_id}: {profile_response.data[0]['id']}")
                                created_profile = profile_response.data[0]
                                if "project_list" not in created_profile:
                                    created_profile["project_list"] = []  # Add empty project_list for compatibility
                                return created_profile
                            else:
                                logger.error(f"Failed to create profile in Supabase: {profile_response}")
                                # Fall back to in-memory profile with user_id
                                
                        except Exception as first_attempt_error:
                            # If failed, it might be because one of the fields doesn't exist
                            logger.error(f"Error in first profile creation attempt: {first_attempt_error}")
                            
                            # Try with only projects field
                            if "project_list" in new_profile:
                                logger.info("Trying again without project_list field")
                                profile_without_project_list = {k: v for k, v in new_profile.items() if k != "project_list"}
                                
                                try:
                                    profile_response = supabase.table("profiles").insert(profile_without_project_list).execute()
                                    
                                    if profile_response.data and len(profile_response.data) > 0:
                                        logger.info(f"Created new profile for user_id {user_id} (without project_list): {profile_response.data[0]['id']}")
                                        created_profile = profile_response.data[0]
                                        created_profile["project_list"] = []  # Add empty project_list for compatibility
                                        return created_profile
                                    else:
                                        logger.error(f"Failed to create profile in Supabase (second attempt): {profile_response}")
                                        # Fall back to in-memory profile with user_id
                                except Exception as second_attempt_error:
                                    logger.error(f"Error in second profile creation attempt: {second_attempt_error}")
                                    # Fall back to in-memory profile with user_id
                    except Exception as create_error:
                        logger.error(f"Error creating profile: {create_error}")
                        logger.error(f"Error trace: {traceback.format_exc()}")
                        # Fall back to in-memory profile with user_id
            except Exception as query_error:
                logger.error(f"Error querying profiles: {query_error}")
                logger.error(f"Error trace: {traceback.format_exc()}")
                # Fall back to in-memory profile

            # If we reach here, we need to return a fallback profile with the user_id
            logger.warning(f"Using in-memory profile as fallback for user_id: {user_id}")
            fallback_profile = in_memory_profile.copy()
            fallback_profile["user_id"] = user_id
            # Also update project_list for compatibility
            fallback_profile["project_list"] = fallback_profile.get("project_list", [])
            return fallback_profile
        
        # If no user_id or no supabase, just return the in-memory profile
        logger.warning("Using in-memory profile (no user_id or no Supabase)")
        return in_memory_profile
    except Exception as e:
        logger.error(f"Error in get_profile_data: {e}")
        logger.error(f"Error trace: {traceback.format_exc()}")
        # Return the default/fallback profile
        return DEFAULT_PROFILE.copy()

def save_profile_to_file():
    """Save the in-memory profile to a file for persistence"""
    try:
        with open('profile_backup.json', 'w') as f:
            json.dump(in_memory_profile, f, indent=2)
        logger.info("Saved in-memory profile to file for persistence")
    except Exception as e:
        logger.error(f"Error saving profile to file: {e}")

def update_profile_data(data, user_id=None):
    """
    Update the profile data in Supabase
    If user_id is provided, try to update the profile for that user
    """
    try:
        # Add or update timestamps
        data["updated_at"] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        if not data.get("created_at"):
            data["created_at"] = data["updated_at"]
        
        # Check for user_id in data or use the provided user_id
        effective_user_id = data.get('user_id') or user_id
        
        logger.info(f"Updating profile with data keys: {list(data.keys())}")
        logger.info(f"User ID from parameter: {user_id}, User ID from data: {data.get('user_id')}")
        logger.info(f"Effective user_id for profile update: {effective_user_id}")
        
        # Filter out any fields that might not be in the schema
        # These are the known safe fields in our profiles table
        safe_fields = ["id", "user_id", "bio", "skills", "experience", 
                        "interests", "name", "location", 
                        "created_at", "updated_at", "project_list", "projects",
                        "calendly_link", "meeting_rules"]
        
        filtered_data = {k: v for k, v in data.items() if k in safe_fields}
        logger.info(f"Filtered profile data to: {list(filtered_data.keys())}")
        
        # Handle required fields
        required_fields = ["bio", "skills", "experience", "interests"]
        for field in required_fields:
            if field not in filtered_data or filtered_data[field] is None or filtered_data[field] == "":
                filtered_data[field] = DEFAULT_PROFILE.get(field, "Not specified")
                logger.info(f"Using default value for required field: {field}")
        
        # Handle special fields
        if "project_list" in filtered_data and isinstance(filtered_data["project_list"], list):
            # Convert to string if Supabase doesn't support JSON directly
            try:
                if supabase and filtered_data["project_list"]:
                    # Try converting the project list to a serializable format
                    logger.info("Converting project_list to JSON string")
                    filtered_data["projects"] = json.dumps([p if isinstance(p, dict) else p.__dict__ for p in filtered_data["project_list"]])
            except Exception as json_error:
                logger.error(f"Error converting project_list to JSON: {json_error}")
                filtered_data.pop("project_list", None)
        
        # Remove project_list from data for Supabase (we'll use projects string field instead)
        filtered_data.pop("project_list", None)
        
        if supabase:
            logger.info(f"Attempting to update profile in Supabase")
            
            if effective_user_id:
                # First check if this user exists in the users table by trying to get their auth data
                logger.info(f"Checking if user exists in Supabase auth/users")
                try:
                    # If the user was created through Supabase Auth, they should exist in auth.users
                    # So we'll directly try to create the user in our users table without checking first
                    user_data = {
                        "id": effective_user_id,
                        "username": filtered_data.get("name") or f"user_{effective_user_id[:8]}",
                        "created_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                        "updated_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                    }
                    # Use upsert instead of insert to handle both new and existing users
                    user_response = supabase.table("users").upsert(user_data).execute()
                    logger.info(f"Upserted user in users table: {user_response.data}")
                except Exception as user_error:
                    logger.error(f"Error upserting user in users table: {user_error}")
                    # If this fails, it could be permissions or it could be that the auth.users record doesn't exist
                    # We'll continue anyway and try to create/update the profile
                
                # Now check if user already has a profile
                logger.info(f"Checking for existing profile with user_id: {effective_user_id}")
                response = supabase.table("profiles").select("id").eq("user_id", effective_user_id).execute()
                logger.info(f"Found profiles matching user_id: {response.data}")
                existing_profile = None if not response.data else response.data[0]
                
                if existing_profile:
                    # Update existing profile
                    profile_id = existing_profile["id"]
                    filtered_data["id"] = profile_id
                    filtered_data["user_id"] = effective_user_id
                    
                    logger.info(f"Updating existing profile with ID: {profile_id} for user: {effective_user_id}")
                    logger.info(f"Update payload: {filtered_data}")
                    try:
                        response = supabase.table("profiles").update(filtered_data).eq("id", profile_id).execute()
                        logger.info(f"Update response: {response.data}")
                        if response.data:
                            logger.info("Successfully updated profile in Supabase")
                            # No need to fall back to in-memory profile
                            result = response.data[0]
                            # Add back the project_list field for compatibility
                            if "projects" in result and result["projects"]:
                                try:
                                    result["project_list"] = json.loads(result["projects"])
                                except:
                                    result["project_list"] = []
                            else:
                                result["project_list"] = []
                            return result
                        else:
                            logger.error(f"Failed to update profile in Supabase: {response}")
                            # Continue to in-memory fallback
                    except Exception as update_error:
                        logger.error(f"Error during profile update: {update_error}")
                        logger.error(f"Error trace: {traceback.format_exc()}")
                        # Continue to in-memory fallback
                else:
                    # Create new profile for the user
                    logger.info(f"Creating new profile for user: {effective_user_id}")
                    filtered_data["user_id"] = effective_user_id
                    logger.info(f"Insert payload: {filtered_data}")
                    try:
                        response = supabase.table("profiles").insert(filtered_data).execute()
                        logger.info(f"Insert response: {response.data}")
                        if response.data:
                            logger.info("Successfully created profile in Supabase")
                            # No need to fall back to in-memory profile
                            save_profile_to_file()  # Still save for backup
                            result = response.data[0]
                            # Add back the project_list field for compatibility
                            if "projects" in result and result["projects"]:
                                try:
                                    result["project_list"] = json.loads(result["projects"])
                                except:
                                    result["project_list"] = []
                            else:
                                result["project_list"] = []
                            return result
                        else:
                            logger.error(f"Failed to create profile in Supabase: {response}")
                            # Continue to in-memory fallback
                    except Exception as insert_error:
                        logger.error(f"Error during profile creation: {insert_error} for payload {filtered_data}")
                        logger.error(f"Error trace: {traceback.format_exc()}")
                        # Continue to in-memory fallback
            
            if not effective_user_id:
                logger.warning("No user_id provided, profile will not be created in database")
        
        # Fallback to in-memory update
        logger.warning("Using in-memory profile storage as fallback")
        # Clone the profile to avoid modifying the shared object
        local_profile = in_memory_profile.copy()
        for key, value in data.items():
            if key != 'id' and key != 'user_id':  # Don't overwrite id and user_id
                local_profile[key] = value
        
        # Save updated profile to file for persistence
        # Note: This will update the shared in-memory profile, which is not ideal 
        # but needed for backward compatibility
        for key, value in data.items():
            if key != 'id' and key != 'user_id':
                in_memory_profile[key] = value
                
        save_profile_to_file()
        
        # Add the user_id to the local copy if it was provided
        if effective_user_id:
            local_profile["user_id"] = effective_user_id
            
        return local_profile
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        logger.error(f"Error trace: {traceback.format_exc()}")
        return None

def get_or_create_chatbot(user_id=None, chatbot_id=None, slug=None):
    """
    Get an existing chatbot or create a default one
    """
    try:
        if not supabase:
            return None

        if chatbot_id:
            # Get specific chatbot by ID
            response = supabase.table("chatbots").select("*").eq("id", chatbot_id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
        
        if slug:
            # Get chatbot by slug
            response = supabase.table("chatbots").select("*").eq("public_url_slug", slug).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
        
        if user_id:
            # Get user's default chatbot or create one
            response = supabase.table("chatbots").select("*").eq("user_id", user_id).execute()
            
            if response.data and len(response.data) > 0:
                # User already has a chatbot
                return response.data[0]
            else:
                # Create a default chatbot for the user
                chatbot_data = {
                    "user_id": user_id,
                    "name": "My AI Assistant",
                    "description": "Personal AI chatbot",
                    "is_public": True,
                    "public_url_slug": f"user-{user_id[:8]}",
                    "created_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                    "updated_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                }
                
                response = supabase.table("chatbots").insert(chatbot_data).execute()
                if response.data and len(response.data) > 0:
                    return response.data[0]
        
        # Return default chatbot if none found and no user_id provided
        response = supabase.table("chatbots").select("*").limit(1).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
            
        return None
    except Exception as e:
        logger.error(f"Error getting or creating chatbot: {e}")
        return None

def get_or_create_visitor(visitor_id, visitor_name=None):
    """
    Get or create a visitor in the database
    """
    try:
        if not supabase:
            return None
        
        if not visitor_id:
            return None
        
        # Check if visitor already exists using visitor_id field (TEXT) from frontend
        response = supabase.table("visitors").select("*").eq("visitor_id", visitor_id).execute()
        
        if response.data and len(response.data) > 0:
            # Update last_seen timestamp and name if provided
            visitor = response.data[0]
            update_data = {"last_seen": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
            
            if visitor_name and not visitor.get("name"):
                update_data["name"] = visitor_name
            
            update_response = supabase.table("visitors").update(update_data).eq("id", visitor["id"]).execute()
            
            if update_response.data and len(update_response.data) > 0:
                return update_response.data[0]
            return visitor
        
        # Create new visitor with TEXT visitor_id 
        visitor_data = {
            "visitor_id": visitor_id,  # This is the frontend-generated text ID
            "name": visitor_name or "",  # Use empty string if name is not provided
            "first_seen": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            "last_seen": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        
        response = supabase.table("visitors").insert(visitor_data).execute()
        
        if response.data and len(response.data) > 0:
            logger.info(f"Successfully created new visitor with DB ID: {response.data[0]['id']}")
            return response.data[0]
        
        return None
    except Exception as e:
        logger.error(f"Error getting or creating visitor: {e}")
        logger.error(f"Error trace: {traceback.format_exc()}")
        return None

def log_chat_message(message, sender="user", response=None, visitor_id=None, visitor_name=None, target_user_id=None, chatbot_id=None):
    """
    Log a chat message to the database
    Handle both new schema (with chatbots table) and old schema
    """
    try:
        if not supabase:
            logger.error("Supabase client not initialized")
            return None
        
        # Add extensive logging for debugging
        logger.info(f"Logging chat message with params:")
        logger.info(f"- message: {message[:50]}..." if len(message) > 50 else f"- message: {message}")
        logger.info(f"- sender: {sender}")
        logger.info(f"- visitor_id: {visitor_id}")
        logger.info(f"- visitor_name: {visitor_name}")
        logger.info(f"- target_user_id: {target_user_id}")
        logger.info(f"- chatbot_id: {chatbot_id}")
        
        # Get or create the visitor
        visitor = None
        if visitor_id:
            try:
                visitor = get_or_create_visitor(visitor_id, visitor_name)
                if visitor:
                    logger.info(f"Found/created visitor with DB ID: {visitor['id']}")
                else:
                    logger.warning(f"Failed to get/create visitor with ID: {visitor_id}")
            except Exception as visitor_error:
                logger.error(f"Error getting/creating visitor: {visitor_error}")
                logger.error(f"Error trace: {traceback.format_exc()}")
        
        # Get or create the chatbot if target_user_id is provided but chatbot_id is not
        if target_user_id and not chatbot_id:
            try:
                chatbot = get_or_create_chatbot(user_id=target_user_id)
                if chatbot:
                    chatbot_id = chatbot["id"]
                    logger.info(f"Found/created chatbot with ID: {chatbot_id}")
                else:
                    logger.warning(f"Failed to get/create chatbot for user: {target_user_id}")
            except Exception as chatbot_error:
                logger.error(f"Error getting/creating chatbot: {chatbot_error}")
                logger.error(f"Error trace: {traceback.format_exc()}")
        
        # Prepare message data
        message_data = {
            "message": message,
            "sender": sender,
            "response": response,
            "created_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        }
        
        # Handle visitor_id fields: 
        # 1. visitor_id should be the UUID primary key from visitors table
        # 2. visitor_id_text should be the original string ID from the frontend
        if visitor_id:
            # For compatibility, check if visitor_id_text column exists
            schema_check = supabase.table("messages").select("visitor_id_text").limit(1).execute()
            has_visitor_id_text = schema_check.data and len(schema_check.data) > 0 and 'visitor_id_text' in schema_check.data[0]
            
            if has_visitor_id_text:
                # Store the original text ID in visitor_id_text for direct lookup
                message_data["visitor_id_text"] = visitor_id
                logger.info(f"Added visitor_id_text: {visitor_id}")
            
            # If we got a visitor record, use its UUID primary key for the visitor_id field
            if visitor and "id" in visitor:
                message_data["visitor_id"] = visitor["id"]
                logger.info(f"Added visitor_id UUID: {visitor['id']}")
            
        # Add target user ID if available (for backward compatibility)
        if target_user_id:
            message_data["target_user_id"] = target_user_id
        
        # Add chatbot ID if available (for new schema)
        if chatbot_id:
            message_data["chatbot_id"] = chatbot_id
        else:
            # If we don't have a chatbot_id, this is a problem for the new schema
            # Let's try to get a default chatbot
            try:
                default_chatbot = supabase.table("chatbots").select("id").limit(1).execute()
                if default_chatbot.data and len(default_chatbot.data) > 0:
                    message_data["chatbot_id"] = default_chatbot.data[0]["id"]
                    logger.info(f"Using default chatbot ID: {message_data['chatbot_id']}")
                else:
                    logger.error("No default chatbot found and no chatbot_id provided")
            except Exception as default_chatbot_error:
                logger.error(f"Error getting default chatbot: {default_chatbot_error}")
                logger.error(f"Error trace: {traceback.format_exc()}")
        
        # Check if we have all required fields for the messages table
        required_fields = ["message", "sender"]
        for field in required_fields:
            if field not in message_data or not message_data[field]:
                logger.error(f"Missing required field: {field}")
                return None
        
        # Check if chatbot_id is available (required by schema)
        if "chatbot_id" not in message_data:
            logger.error("Missing chatbot_id and couldn't find a default")
            # This won't work with the new schema, so let's create a dummy record
            try:
                dummy_data = {
                    "message": "System message: No chatbot available",
                    "sender": "system",
                    "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                    "visitor_id_text": visitor_id
                }
                return [dummy_data]
            except:
                return None
        
        # Log the message data for debugging
        logger.info(f"Final message data for insertion: {message_data}")
        
        try:
            # Insert the message
            response = supabase.table("messages").insert(message_data).execute()
            
            if response.data and len(response.data) > 0:
                logger.info(f"Successfully logged chat message with ID: {response.data[0]['id']}")
                return response.data
            else:
                logger.error(f"Failed to insert message, empty response data: {response}")
                return None
                
        except Exception as insert_error:
            logger.error(f"Error inserting chat message: {insert_error}")
            logger.error(f"Error trace: {traceback.format_exc()}")
            return None
    
    except Exception as e:
        logger.error(f"Error logging chat message: {e}")
        logger.error(f"Error trace: {traceback.format_exc()}")
        return None

def get_chat_history(limit=50, visitor_id=None, chatbot_id=None, target_user_id=None):
    """
    Get chat history from Supabase using the messages_with_visitors view
    """
    try:
        logger.info(f"Getting chat history with params: limit={limit}, visitor_id={visitor_id}, chatbot_id={chatbot_id}, target_user_id={target_user_id}")
        result_messages = []
        
        if supabase:
            try:
                # Start building the query using the view
                query = supabase.table("messages_with_visitors").select("*").order("created_at", desc=True).limit(limit)
                
                # Always filter by target_user_id if provided
                if target_user_id:
                    query = query.eq("target_user_id", target_user_id)
                    logger.info(f"Filtering messages by target_user_id: {target_user_id}")
                
                # Filter by chatbot_id if provided
                if chatbot_id:
                    query = query.eq("chatbot_id", chatbot_id)
                    logger.info(f"Filtering messages by chatbot_id: {chatbot_id}")
                
                # Handle visitor_id filtering
                if visitor_id:
                    logger.info(f"Processing visitor_id: {visitor_id}")
                    
                    # Try to find the visitor record by visitor_id field (TEXT)
                    logger.info(f"Looking up visitor by visitor_id (TEXT): {visitor_id}")
                    visitor_response = supabase.table("visitors").select("id").eq("visitor_id", visitor_id).execute()
                    
                    if visitor_response.data and len(visitor_response.data) > 0:
                        # We found the visitor - use their UUID in the visitor_id column
                        visitor_uuid = visitor_response.data[0]["id"]
                        logger.info(f"Found visitor with UUID: {visitor_uuid}")
                        query = query.eq("visitor_id", visitor_uuid)
                    else:
                        # No visitor record found, try direct lookup with visitor_id_text
                        logger.info(f"No visitor record found, using visitor_id_text: {visitor_id}")
                        query = query.eq("visitor_id_text", visitor_id)
                
                # Execute the final query
                response = query.execute()
                if response.data:
                    logger.info(f"Retrieved {len(response.data)} messages")
                    # Process the response
                    for msg in response.data:
                        message = {
                            "id": msg["id"],
                            "message": msg["message"],
                            "response": msg["response"],
                            "sender": msg["sender"],
                            "created_at": msg["created_at"],
                            "timestamp": msg["timestamp"],
                            "chatbot_id": msg["chatbot_id"],
                            "visitor_id": msg["visitor_id"],
                            "visitor_id_text": msg["visitor_id_text"],
                            "target_user_id": msg["target_user_id"],
                            "visitor_name": msg["visitor_name"]
                        }
                        result_messages.append(message)
                else:
                    logger.warning("No messages found in database")
                    result_messages = []
            
            except Exception as db_error:
                logger.error(f"Error querying chat history from Supabase: {db_error}")
                logger.error(traceback.format_exc())
                result_messages = []
        
        # Sort messages by timestamp
        result_messages.sort(key=lambda x: x.get("created_at") or x.get("timestamp") or "", reverse=True)
        
        logger.info(f"Returning {len(result_messages)} chat history messages")
        return result_messages
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        logger.error(traceback.format_exc())
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
                    logger.info(f"Admin login successful for user: {username}")
                    return True
            
            logger.info(f"Admin login failed for user: {username}")
            return False
        else:
            logger.warning("Supabase client not available, using default admin check")
            # Fallback for demo purposes - in production, always use the database
            return username == "admin" and password == "admin123"
    except Exception as e:
        logger.error(f"Error verifying admin login: {e}")
        # Fallback for demo purposes
        return username == "admin" and password == "admin123"

def is_admin_user(user_id=None, email=None):
    """
    Check if a user is an admin based on user_id or email
    """
    try:
        if not supabase:
            logger.warning("Supabase client not available, admin check failed")
            return False
            
        if not user_id and not email:
            logger.warning("No user_id or email provided for admin check")
            return False
            
        query = supabase.table("admin_users").select("*")
        
        # Build query conditions
        conditions = []
        if user_id:
            conditions.append(f"user_id.eq.{user_id}")
        if email:
            conditions.append(f"email.eq.{email}")
            
        if conditions:
            query = query.or_(",".join(conditions))
            
        response = query.limit(1).execute()
        
        if response.data and len(response.data) > 0:
            logger.info(f"Found admin user: {response.data[0]}")
            return True
            
        logger.info(f"No admin user found for user_id={user_id}, email={email}")
        return False
    except Exception as e:
        logger.error(f"Error checking admin user status: {e}")
        return False

def add_project(project_data, user_id=None):
    """
    Add a new project to the profile
    Returns the updated profile data if successful
    """
    try:
        # Generate unique ID for the project
        project_data["id"] = str(uuid.uuid4())
        project_data["created_at"] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        
        # Get current profile
        profile = get_profile_data(user_id=user_id)
        
        if not profile:
            logger.error("Profile not found when adding project")
            return None
            
        # Initialize project_list if it doesn't exist
        if "project_list" not in profile:
            profile["project_list"] = []
        
        # Add project to list
        profile["project_list"].append(project_data)
        
        # Update the profile with the new project list
        updated_profile = update_profile_data(profile, user_id=user_id)
        
        return updated_profile
    except Exception as e:
        logger.error(f"Error adding project: {e}")
        return None
        
def update_project(project_id, project_data, user_id=None):
    """
    Update an existing project
    Returns the updated profile data if successful
    """
    try:
        # Get current profile
        profile = get_profile_data(user_id=user_id)
        
        if not profile or "project_list" not in profile:
            logger.error("Profile or project list not found when updating project")
            return None
            
        # Find the project to update
        found = False
        for i, project in enumerate(profile["project_list"]):
            if project.get("id") == project_id:
                # Preserve the original ID and created_at
                project_data["id"] = project_id
                if "created_at" in project:
                    project_data["created_at"] = project["created_at"]
                
                # Add updated_at timestamp
                project_data["updated_at"] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                
                # Update the project
                profile["project_list"][i] = project_data
                found = True
                break
                
        if not found:
            logger.error(f"Project with ID {project_id} not found")
            return None
            
        # Update the profile with the updated project list
        updated_profile = update_profile_data(profile, user_id=user_id)
        
        return updated_profile
    except Exception as e:
        logger.error(f"Error updating project: {e}")
        return None
        
def delete_project(project_id, user_id=None):
    """
    Delete a project
    Returns True if successful, False otherwise
    """
    try:
        # Get current profile
        profile = get_profile_data(user_id=user_id)
        
        if not profile or "project_list" not in profile:
            logger.error("Profile or project list not found when deleting project")
            return False
            
        # Find and remove the project
        original_length = len(profile["project_list"])
        profile["project_list"] = [p for p in profile["project_list"] if p.get("id") != project_id]
        
        if len(profile["project_list"]) == original_length:
            logger.error(f"Project with ID {project_id} not found")
            return False
            
        # Update the profile with the new project list
        updated_profile = update_profile_data(profile, user_id=user_id)
        
        return updated_profile is not None
    except Exception as e:
        logger.error(f"Error deleting project: {e}")
        return False

def check_schema_applied():
    """Check if the schema has been properly applied to Supabase"""
    if not supabase:
        logger.warning("Cannot check schema - Supabase client not initialized")
        return False
    
    try:
        # Check if profiles table has the expected columns
        logger.info("Checking if schema has been properly applied...")
        
        # Check if profiles table exists and has the expected projects column
        try:
            # Try to get profile column information through a direct query
            response = supabase.table("profiles").select("id, projects").limit(1).execute()
            logger.info(f"Profiles table exists, sample response: {response.data}")
            has_projects = True  # If the query succeeds, the column exists
        except Exception as e:
            logger.warning(f"Failed to query profiles table or projects column doesn't exist: {e}")
            has_projects = False
            
        if has_projects:
            logger.info("Schema verification passed: profiles table has projects column")
            return True
        else:
            logger.warning("Schema verification failed: profiles table missing projects column")
            logger.warning("Please apply the schema by running the SQL in apply_schema.sql")
            return False
    except Exception as e:
        logger.error(f"Error checking schema: {e}")
        logger.error(f"Error trace: {traceback.format_exc()}")
        return False

# Call this function on startup to check schema status
schema_ok = check_schema_applied()

def search_projects(query: str, user_id: str = None) -> List[Dict]:
    """
    Search for projects using full-text search
    If user_id is provided, only search that user's projects
    """
    try:
        if not supabase:
            logger.warning("No Supabase connection available")
            return []

        # Build the search query
        search_query = supabase.from_('projects').select('*')
        
        # Add text search condition
        search_query = search_query.textSearch('searchable_content', query)
        
        # Filter by user if provided
        if user_id:
            search_query = search_query.eq('user_id', user_id)
        
        # Execute query
        response = search_query.execute()
        
        if response.data:
            logger.info(f"Found {len(response.data)} projects matching query: {query}")
            return response.data
        else:
            logger.info(f"No projects found matching query: {query}")
            return []
            
    except Exception as e:
        logger.error(f"Error searching projects: {e}")
        logger.error(f"Error trace: {traceback.format_exc()}")
        return []

def get_all_profiles():
    """
    Get all user profiles from the database
    """
    try:
        if not supabase:
            print("Supabase client not initialized")
            return []
        
        response = supabase.table("profiles").select("*").execute()
        profiles = response.data
        
        # Convert each profile's projects JSON to project_list if needed
        for profile in profiles:
            if profile.get("projects") and not profile.get("project_list"):
                try:
                    import json
                    projects_json = profile.get("projects")
                    project_list = json.loads(projects_json)
                    profile["project_list"] = project_list
                except Exception as e:
                    print(f"Error parsing projects JSON: {e}")
                    profile["project_list"] = []
            elif not profile.get("project_list"):
                profile["project_list"] = []
                
        return profiles
    except Exception as e:
        print(f"Error getting all profiles: {e}")
        return []

def get_all_documents():
    """
    Get all documents from the database
    """
    try:
        if not supabase:
            print("Supabase client not initialized")
            return []
        
        response = supabase.table("user_documents").select("*").execute()
        
        # If no documents found, try to create the test document
        if not response.data:
            logger.info("No documents found, adding test document")
            create_test_document()
            # Try fetching again
            response = supabase.table("user_documents").select("*").execute()
            
        return response.data
    except Exception as e:
        print(f"Error getting all documents: {e}")
        return []

def create_test_document():
    """
    Create a test document for the system - specifically the truck driver persona
    """
    try:
        if not supabase:
            logger.error("Supabase client not initialized")
            return False
            
        # Check if document already exists
        user_id = "9837e518-80f6-46d4-9aec-cf60c0d8be37"  # Ciril's user ID
        
        existing = supabase.table("user_documents").select("*").eq("user_id", user_id).eq("title", "Truck_Driver_Persona").execute()
        
        if existing.data and len(existing.data) > 0:
            logger.info(f"Test document already exists with ID: {existing.data[0]['id']}")
            return True
            
        # Create the document
        test_doc = {
            "user_id": user_id,
            "title": "Truck_Driver_Persona",
            "file_name": "Truck_Driver_Persona.pdf",
            "file_size": "2070",
            "mime_type": "application/pdf",
            "storage_path": f"{user_id}/1743267312011_Truck_Driver_Persona.pdf",
            "extracted_text": """
--- Page 1 ---
Name: Jack Thompson
Age: 45
Gender: Male
Experience: 20 years
Workplace: Thompson Freight Services
Location: Texas, USA
Bio & Background:
A highly skilled and reliable truck driver with two decades of experience in long-haul transportation.
Dedicated to
timely and safe deliveries while ensuring compliance with traffic and safety regulations.
Key Skills:
- Long-distance driving
- Vehicle maintenance & troubleshooting
- Route planning & navigation
- Time management
- Safety compliance
Daily Routine:
6:00 AM - 8:00 AM: Pre-trip inspection & loading
8:00 AM - 12:00 PM: Driving & deliveries
12:00 PM - 1:00 PM: Break & rest
1:00 PM - 6:00 PM: More driving & fuel stops
6:00 PM - 8:00 PM: End-of-day checks & rest
Challenges & Pain Points:
- Long hours away from family
- Fatigue from extended driving
- Unpredictable weather & road conditions
Motivations:
--- Page 2 ---
- Financial stability for family
- Passion for the open road
- Pride in timely deliveries & service
Quote:
"Being a truck driver is not just a job; it's a lifestyle of commitment and resilience."
"""
        }
        
        # Insert into user_documents
        result = supabase.table("user_documents").insert(test_doc).execute()
        
        if result.data:
            logger.info(f"Successfully created test document with ID: {result.data[0]['id']}")
            return True
        else:
            logger.error(f"Failed to create test document: {result.error}")
            return False
            
    except Exception as e:
        logger.error(f"Error creating test document: {e}")
        return False

def get_all_projects_from_table():
    """
    Get all projects directly from the projects table
    This is needed to ensure projects are properly added to the vector database
    """
    try:
        if not supabase:
            print("Supabase client not initialized")
            return []
        
        response = supabase.table("projects").select("*").execute()
        return response.data
    except Exception as e:
        print(f"Error getting all projects from table: {e}")
        return [] 