# Visitor ID Implementation

This document explains the visitor ID implementation in the Agent Cyril application, including the database schema, how the frontend and backend interact, and the changes made to fix the original issues.

## Overview

The application tracks chat visitors using a two-part system:

1. **Frontend**: Generates a string-based visitor ID (e.g., `v_abc123def456`) stored in localStorage
2. **Backend**: Stores this ID in the database and maintains proper relationships between tables

## Database Schema

### Visitors Table
- `id` (UUID, Primary Key): The database's internal unique identifier
- `visitor_id` (TEXT): The frontend-generated string ID
- `name` (TEXT): Optional visitor name
- Other fields: email, first_seen, last_seen, etc.

### Messages Table
- `id` (UUID, Primary Key): Unique message identifier
- `visitor_id` (UUID, Foreign Key): References `visitors.id`
- `visitor_id_text` (TEXT): Duplicate storage of the frontend visitor ID for easier lookup
- Other fields: message, response, chatbot_id, etc.

## How It Works

1. **Frontend Generation**:
   ```typescript
   // Generate a random visitor ID and store in localStorage
   const visitorId = 'v_' + Math.random().toString(36).substring(2, 15) + 
     Math.random().toString(36).substring(2, 15);
   localStorage.setItem('visitor_id', visitorId);
   ```

2. **Frontend to Backend**:
   ```typescript
   // Send message with visitor ID to backend
   const payload = { 
     message, 
     visitor_id: visitorId,
     visitor_name: visitorName
   };
   ```

3. **Backend Processing**:
   ```python
   # Get or create visitor based on the frontend visitor_id string
   visitor = get_or_create_visitor(visitor_id, visitor_name)
   
   # Use the visitor's UUID primary key as the foreign key in messages
   message_data = {
     "message": message,
     "visitor_id": visitor["id"],  # UUID from visitors table
     "visitor_id_text": visitor_id  # Original string ID from frontend
   }
   ```

## The Original Issue

The application had a type mismatch issue:

1. Frontend was sending a string-based visitor ID (e.g., "v_abc123def456")
2. Backend was trying to use this string directly in the `messages.visitor_id` column, which expected a UUID
3. This broke the referential integrity between the tables

## The Fix

We implemented a proper fix that maintains referential integrity:

1. Keep `visitors.id` as UUID (primary key)
2. Store the frontend-generated string in `visitors.visitor_id` as TEXT
3. In messages table:
   - `visitor_id` references `visitors.id` (UUID)
   - `visitor_id_text` stores the original frontend ID for backward compatibility

### Backend Code Changes

1. Modified `get_or_create_visitor()` to:
   - Look up visitors by the TEXT `visitor_id` field
   - Return the complete visitor record including the UUID primary key

2. Modified `log_chat_message()` to:
   - Store the visitor's UUID primary key in `messages.visitor_id`
   - Store the original frontend string ID in `messages.visitor_id_text`

### SQL Schema Changes

Created `PROPER_VISITOR_ID_FIX.sql` to:
1. Ensure `visitor_id_text` column exists in the messages table
2. Reset `messages.visitor_id` to be UUID type (if it was changed)
3. Recreate proper foreign key constraints
4. Update existing records to maintain data consistency

## Testing and Verification

We created `verify_visitor_id_fix.py` to:
1. Check the database schema for correct column types
2. Test the complete visitor ID flow:
   - Create a visitor with a frontend-style ID
   - Create a message using proper referential integrity
   - Verify retrieval by both direct lookup and proper joins

## Best Practices

1. **Maintain Proper Referential Integrity**:
   - Always use proper foreign keys between tables
   - Store both the UUID for integrity and the original string for convenience

2. **Type Safety**:
   - Be careful about column types, especially when handling IDs
   - Use appropriate SQL types (UUID for database keys, TEXT for string identifiers)

3. **Clear Naming**:
   - `visitors.id` (UUID): Internal database identifier
   - `visitors.visitor_id` (TEXT): The frontend-generated identifier
   - `messages.visitor_id` (UUID): Foreign key to visitors.id
   - `messages.visitor_id_text` (TEXT): Convenience duplicate of visitors.visitor_id 