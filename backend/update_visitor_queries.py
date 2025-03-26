#!/usr/bin/env python3
"""
Update Visitor ID Queries

This script modifies the database.py file to use visitor_id_text instead of visitor_id
when querying the messages table directly. This fixes the 'invalid input syntax for type uuid'
error that occurs when string visitor IDs are used with UUID columns.

Usage:
  python update_visitor_queries.py

"""

import os
import re
import shutil
import sys

# Path to the database.py file
DB_FILE_PATH = 'app/database.py'
BACKUP_FILE_PATH = 'app/database.py.bak'

def backup_file(file_path, backup_path):
    """Create a backup of the original file."""
    try:
        shutil.copy2(file_path, backup_path)
        print(f"Created backup at {backup_path}")
        return True
    except Exception as e:
        print(f"Error creating backup: {e}")
        return False

def update_get_chat_history_function(content):
    """
    Update the get_chat_history function to use visitor_id_text
    """
    # Find the get_chat_history function
    pattern = r'def get_chat_history\(.*?\):(.*?)(?=def \w+\(|\Z)'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        print("Could not find get_chat_history function in the file.")
        return content
    
    # Get the function body
    function_body = match.group(1)
    
    # Pattern to match visitor_id query
    visitor_query_pattern = r'(visitor_response = supabase\.table\("visitors"\)\.select\("id"\)\.eq\("visitor_id", visitor_id\)\.execute\(\).*?visitor_db_id = visitor_response\.data\[0\]\["id"\].*?query = query\.eq\("visitor_id", visitor_db_id\))'
    
    # Replace with visitor_id_text query
    replacement = r"""# Try using visitor_id_text first (direct query without join)
            query = query.eq("visitor_id_text", visitor_id)
            
            # This is the old way using visitor_id as UUID:
            # visitor_response = supabase.table("visitors").select("id").eq("visitor_id", visitor_id).execute()
            # if visitor_response.data and len(visitor_response.data) > 0:
            #     visitor_db_id = visitor_response.data[0]["id"]
            #     query = query.eq("visitor_id", visitor_db_id)"""
    
    # Replace all occurrences of the pattern
    updated_function_body = re.sub(visitor_query_pattern, replacement, function_body, flags=re.DOTALL)
    
    # Check if we made any replacements
    if updated_function_body == function_body:
        print("Warning: No changes made to the get_chat_history function.")
        return content
    
    # Replace the old function body with the updated one
    updated_content = content.replace(function_body, updated_function_body)
    
    return updated_content

def update_log_chat_message_function(content):
    """
    Update the log_chat_message function to ensure visitor_id_text is properly set
    """
    # Find the log_chat_message function
    pattern = r'def log_chat_message\(.*?\):(.*?)(?=def \w+\(|\Z)'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        print("Could not find log_chat_message function in the file.")
        return content
    
    # Get the function body
    function_body = match.group(1)
    
    # Make sure visitor_id_text is properly set in the message_data
    visitor_id_text_pattern = r'(message_data = \{.*?"visitor_id_text": visitor_id.*?\})'
    
    if not re.search(visitor_id_text_pattern, function_body, re.DOTALL):
        # If visitor_id_text is not set, add it to the message_data
        message_data_pattern = r'(message_data = \{[^\}]*\})'
        message_data_replacement = r'\1\n        # Ensure visitor_id_text is set\n        message_data["visitor_id_text"] = visitor_id'
        
        updated_function_body = re.sub(message_data_pattern, message_data_replacement, function_body, flags=re.DOTALL)
        
        # Replace the old function body with the updated one
        updated_content = content.replace(function_body, updated_function_body)
        return updated_content
    
    return content

def main():
    """Main function to update the database.py file."""
    # Check if file exists
    if not os.path.exists(DB_FILE_PATH):
        print(f"Error: {DB_FILE_PATH} not found.")
        sys.exit(1)
    
    # Create backup
    if not backup_file(DB_FILE_PATH, BACKUP_FILE_PATH):
        sys.exit(1)
    
    try:
        # Read the file
        with open(DB_FILE_PATH, 'r') as f:
            content = f.read()
        
        # Update the functions
        updated_content = update_get_chat_history_function(content)
        updated_content = update_log_chat_message_function(updated_content)
        
        # Write the updated content back to the file
        with open(DB_FILE_PATH, 'w') as f:
            f.write(updated_content)
        
        print(f"Successfully updated {DB_FILE_PATH}")
        print("Please restart the backend server for changes to take effect.")
    
    except Exception as e:
        print(f"Error updating file: {e}")
        # Restore backup on error
        print("Restoring from backup...")
        shutil.copy2(BACKUP_FILE_PATH, DB_FILE_PATH)
        print("Backup restored.")
        sys.exit(1)

if __name__ == "__main__":
    main() 