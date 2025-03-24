# Supabase Integration for Agent Ciril

This document explains how to set up and use Supabase with the Agent Ciril application to store admin panel data and chat history.

## Overview

The application uses Supabase as its database to store:
1. Profile data (bio, skills, experience, projects, interests)
2. Chat messages history

## Prerequisites

- A Supabase account (free tier is sufficient)
- A Supabase project set up with the URL and API key
- The application codebase configured with Supabase credentials

## Setup Instructions

### 1. Configure Environment Variables

The application uses environment variables to connect to Supabase:

**Backend (.env):**
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-api-key
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Create Supabase Tables

You need to set up the necessary tables in Supabase:

1. Log in to your Supabase dashboard at https://app.supabase.com/
2. Go to the SQL Editor
3. Create a new query and paste the contents of `create_supabase_tables.sql`
4. Click "Run" to execute the SQL script

Alternatively, run the setup script:
```
./setup_supabase.sh
```

### 3. Verify Setup

Run the test script to verify your Supabase connection and tables:
```
python test_supabase.py
```

You should see success messages for connecting to Supabase and accessing the tables.

## Database Schema

### Profiles Table

Stores information displayed in the admin panel:

| Column      | Type      | Description                   |
|-------------|-----------|-------------------------------|
| id          | UUID      | Primary key                   |
| bio         | TEXT      | Personal bio                  |
| skills      | TEXT      | Technical skills              |
| experience  | TEXT      | Professional experience       |
| projects    | TEXT      | Portfolio projects            |
| interests   | TEXT      | Personal interests/hobbies    |
| created_at  | TIMESTAMP | Creation timestamp            |
| updated_at  | TIMESTAMP | Last update timestamp         |

### Messages Table

Stores chat history:

| Column     | Type      | Description                   |
|------------|-----------|-------------------------------|
| id         | UUID      | Primary key                   |
| message    | TEXT      | User's message                |
| sender     | TEXT      | Message sender identifier     |
| response   | TEXT      | AI response (if any)          |
| timestamp  | TIMESTAMP | Message timestamp             |

## Using the Admin Panel

Once set up, the admin panel will automatically connect to Supabase:

1. Navigate to `/admin` in your browser
2. The form will load profile data from Supabase
3. Make changes and save them
4. Changes will be stored in Supabase and reflected in the chat experience

## Troubleshooting

### Common Issues

1. **Connection errors**:
   - Verify that your Supabase URL and API keys are correct
   - Check that your project is running and accessible

2. **Permission denied errors**:
   - The SQL script sets up Row Level Security (RLS) policies
   - Verify these policies are correctly applied in Supabase

3. **Data not saving**:
   - Check browser console for error messages
   - Verify network requests in the browser dev tools

## Extending the Database

To add more tables or fields:

1. Modify the `create_supabase_tables.sql` script
2. Update the relevant models in `backend/app/models.py`
3. Modify the API endpoints in the backend
4. Update the frontend components to display the new data

## Security Considerations

- The API key used in the frontend is the "anon" key, which has limited permissions
- RLS policies control what operations different users can perform
- For production, consider implementing authentication for admin access 