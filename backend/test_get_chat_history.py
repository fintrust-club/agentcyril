#!/usr/bin/env python3
"""
test_get_chat_history.py - Test the updated get_chat_history function with different visitor IDs
"""

import os
import sys
import logging
import traceback
from dotenv import load_dotenv
from supabase import create_client, Client

# Add the app directory to the path so we can import the database module
sys.path.append('app')
from database import get_chat_history

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("test_get_chat_history.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

def main():
    """Main function"""
    logger.info("Testing the updated get_chat_history function")
    
    # Check command line arguments
    if len(sys.argv) < 2:
        logger.error("Usage: python test_get_chat_history.py <visitor_id>")
        sys.exit(1)
    
    visitor_id = sys.argv[1]
    logger.info(f"Testing get_chat_history with visitor_id: {visitor_id}")
    
    try:
        # Call the get_chat_history function directly
        history = get_chat_history(visitor_id=visitor_id, limit=50)
        
        if history:
            logger.info(f"✅ Success! Found {len(history)} messages in chat history")
            
            # Print message details
            for i, msg in enumerate(history):
                message_text = msg.get('message', 'No message text')
                message_text = message_text[:50] + '...' if len(message_text) > 50 else message_text
                
                logger.info(f"Message {i+1}:")
                logger.info(f"  - ID: {msg.get('id', 'No ID')}")
                logger.info(f"  - Message: {message_text}")
                logger.info(f"  - Created: {msg.get('created_at', 'No timestamp')}")
                logger.info(f"  - visitor_id: {msg.get('visitor_id', 'None')}")
                logger.info(f"  - visitor_id_text: {msg.get('visitor_id_text', 'None')}")
                logger.info(f"  - chatbot_id: {msg.get('chatbot_id', 'None')}")
                logger.info("")
        else:
            logger.warning(f"⚠️ No messages found for visitor ID: {visitor_id}")
            
    except Exception as e:
        logger.error(f"❌ Error testing get_chat_history: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main() 