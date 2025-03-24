#!/usr/bin/env python
"""
Test script for Supabase integration.
This script will test the connection to Supabase and perform basic CRUD operations.
"""

import os
import sys
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from backend/.env
backend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', '.env')
load_dotenv(backend_env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print(f"Error: Missing Supabase environment variables.")
    print(f"Make sure SUPABASE_URL and SUPABASE_KEY are set in {backend_env_path}")
    sys.exit(1)

def print_separator():
    print("\n" + "=" * 50 + "\n")

def test_connection():
    """Test the connection to Supabase"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Successfully connected to Supabase!")
        return supabase
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        sys.exit(1)

def test_profiles_table(supabase: Client):
    """Test CRUD operations on the profiles table"""
    print_separator()
    print("Testing profiles table...")
    
    # Get profile data
    try:
        response = supabase.table("profiles").select("*").limit(1).execute()
        if response.data:
            print("✅ Successfully retrieved profile data:")
            print(json.dumps(response.data[0], indent=2))
        else:
            print("⚠️ No profiles found. Creating a default profile...")
            # Insert a default profile
            default_profile = {
                "bio": "Test bio",
                "skills": "Test skills",
                "experience": "Test experience",
                "projects": "Test projects",
                "interests": "Test interests"
            }
            response = supabase.table("profiles").insert(default_profile).execute()
            print("✅ Successfully created default profile:")
            print(json.dumps(response.data[0], indent=2))
    except Exception as e:
        print(f"❌ Error accessing profiles table: {e}")
        return False
    
    return True

def test_messages_table(supabase: Client):
    """Test CRUD operations on the messages table"""
    print_separator()
    print("Testing messages table...")
    
    # Insert a test message
    try:
        test_message = {
            "message": "Test message",
            "sender": "test_script",
            "response": "Test response"
        }
        response = supabase.table("messages").insert(test_message).execute()
        print("✅ Successfully inserted test message:")
        print(json.dumps(response.data[0], indent=2))
        
        # Get message data
        message_id = response.data[0]["id"]
        response = supabase.table("messages").select("*").eq("id", message_id).execute()
        print("✅ Successfully retrieved message data")
        
        # Delete the test message
        response = supabase.table("messages").delete().eq("id", message_id).execute()
        print("✅ Successfully deleted test message")
    except Exception as e:
        print(f"❌ Error accessing messages table: {e}")
        return False
    
    return True

def main():
    """Main function"""
    print("Testing Supabase Integration")
    print_separator()
    
    supabase = test_connection()
    
    profiles_ok = test_profiles_table(supabase)
    messages_ok = test_messages_table(supabase)
    
    print_separator()
    if profiles_ok and messages_ok:
        print("🎉 All tests passed! Supabase is configured correctly.")
    else:
        print("⚠️ Some tests failed. Please check the output above for details.")

if __name__ == "__main__":
    main() 