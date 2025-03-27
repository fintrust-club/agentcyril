#!/usr/bin/env python3
"""
verify_visitor_id_fix.py - Test and verify that the visitor ID fix has been properly applied
"""

import os
import sys
import time
import uuid
import logging
import traceback
from dotenv import load_dotenv
from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("verify_visitor_id_fix.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Supabase connection details
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def check_schema(supabase: Client):
    """Check that the database schema has the correct column types"""
    logger.info("Checking database schema...")
    
    try:
        # Get column types from information_schema
        response = supabase.table("information_schema.columns").select(
            "table_name,column_name,data_type"
        ).in_("table_name", ["visitors", "messages"]).in_("column_name", ["id", "visitor_id", "visitor_id_text"]).execute()
        
        if not response.data:
            logger.error("❌ Failed to get column information")
            return False
            
        # Verify the column types
        column_types = {}
        for col in response.data:
            key = f"{col['table_name']}.{col['column_name']}"
            column_types[key] = col['data_type']
            
        logger.info(f"Column types: {column_types}")
        
        # Check specific column types
        errors = []
        
        # Visitors table checks
        if 'visitors.id' not in column_types:
            errors.append("❌ visitors.id column not found")
        elif column_types['visitors.id'] != 'uuid':
            errors.append(f"❌ visitors.id has type {column_types['visitors.id']}, expected uuid")
            
        if 'visitors.visitor_id' not in column_types:
            errors.append("❌ visitors.visitor_id column not found")
        elif column_types['visitors.visitor_id'] != 'text':
            errors.append(f"❌ visitors.visitor_id has type {column_types['visitors.visitor_id']}, expected text")
            
        # Messages table checks
        if 'messages.visitor_id' not in column_types:
            errors.append("❌ messages.visitor_id column not found")
        elif column_types['messages.visitor_id'] != 'uuid':
            errors.append(f"❌ messages.visitor_id has type {column_types['messages.visitor_id']}, expected uuid")
            
        if 'messages.visitor_id_text' not in column_types:
            errors.append("❌ messages.visitor_id_text column not found")
        elif column_types['messages.visitor_id_text'] != 'text':
            errors.append(f"❌ messages.visitor_id_text has type {column_types['messages.visitor_id_text']}, expected text")
            
        # Report any errors
        if errors:
            for error in errors:
                logger.error(error)
            return False
            
        # All checks passed
        logger.info("✅ Database schema looks correct")
        return True
    except Exception as e:
        logger.error(f"❌ Error checking schema: {e}")
        logger.error(traceback.format_exc())
        return False

def test_visitor_id_flow(supabase: Client):
    """Test creating a visitor and message with the correct visitor_id flow"""
    logger.info("Testing visitor ID flow...")
    
    try:
        # Step 1: Create a test visitor ID (similar to what frontend would generate)
        frontend_visitor_id = f"v_{uuid.uuid4().hex[:12]}"
        logger.info(f"Generated frontend visitor ID: {frontend_visitor_id}")
        
        # Step 2: Add the visitor
        visitor_data = {
            "visitor_id": frontend_visitor_id,
            "name": "Test Visitor",
            "first_seen": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            "last_seen": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        
        visitor_response = supabase.table("visitors").insert(visitor_data).execute()
        
        if not visitor_response.data or len(visitor_response.data) == 0:
            logger.error("❌ Failed to create visitor")
            return False
            
        visitor = visitor_response.data[0]
        visitor_uuid = visitor["id"]
        logger.info(f"✅ Created visitor with frontend ID '{frontend_visitor_id}' and UUID '{visitor_uuid}'")
        
        # Step 3: Get a chatbot ID to use for the message
        chatbot_response = supabase.table("chatbots").select("id").limit(1).execute()
        
        if not chatbot_response.data or len(chatbot_response.data) == 0:
            logger.error("❌ No chatbots found in the database")
            return False
            
        chatbot_id = chatbot_response.data[0]["id"]
        logger.info(f"Using chatbot ID: {chatbot_id}")
        
        # Step 4: Create a message with the visitor ID
        message_data = {
            "message": "Test message for visitor ID verification",
            "sender": "user",
            "visitor_id": visitor_uuid,  # This should be the UUID primary key
            "visitor_id_text": frontend_visitor_id,  # This should be the frontend string ID
            "chatbot_id": chatbot_id,
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            "created_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        
        message_response = supabase.table("messages").insert(message_data).execute()
        
        if not message_response.data or len(message_response.data) == 0:
            logger.error("❌ Failed to create message")
            return False
            
        message_id = message_response.data[0]["id"]
        logger.info(f"✅ Created message with ID: {message_id}")
        
        # Step 5: Verify message retrieval by visitor_id_text directly
        direct_query_response = supabase.table("messages").select("*").eq("visitor_id_text", frontend_visitor_id).execute()
        
        if not direct_query_response.data or len(direct_query_response.data) == 0:
            logger.error("❌ Failed to retrieve message by visitor_id_text")
            return False
            
        logger.info(f"✅ Retrieved message by visitor_id_text: {direct_query_response.data[0]['id']}")
        
        # Step 6: Verify message retrieval by joining with visitors
        join_query = f"""
            SELECT m.id as message_id, m.message, v.visitor_id as frontend_id
            FROM messages m
            JOIN visitors v ON m.visitor_id = v.id
            WHERE v.visitor_id = '{frontend_visitor_id}'
        """
        
        join_response = supabase.rpc('query', {"query_text": join_query}).execute()
        
        if not join_response.data or len(join_response.data) == 0:
            logger.error("❌ Failed to retrieve message by joining with visitors")
            return False
            
        logger.info(f"✅ Retrieved message by proper join: {join_response.data[0]['message_id']}")
        
        # All checks passed
        logger.info("✅ Visitor ID flow works correctly")
        return True
    except Exception as e:
        logger.error(f"❌ Error testing visitor ID flow: {e}")
        logger.error(traceback.format_exc())
        return False

def main():
    """Main function to verify visitor ID fix"""
    logger.info("Starting verification of visitor ID fix")
    
    if not SUPABASE_URL:
        logger.error("❌ SUPABASE_URL environment variable not set")
        sys.exit(1)
    if not SUPABASE_KEY:
        logger.error("❌ SUPABASE_KEY environment variable not set")
        sys.exit(1)
    
    logger.info("✅ Environment variables verified")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Connected to Supabase")
        
        schema_ok = check_schema(supabase)
        flow_ok = test_visitor_id_flow(supabase)
        
        if schema_ok and flow_ok:
            logger.info("✅ All checks passed! The visitor ID fix has been properly applied.")
        else:
            logger.error("❌ Verification failed. Please fix the issues and try again.")
            if not schema_ok:
                logger.error("❌ Database schema issues detected.")
            if not flow_ok:
                logger.error("❌ Visitor ID flow issues detected.")
            sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Error connecting to Supabase: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main() 