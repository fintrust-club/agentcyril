# Updating Your Supabase Schema for User Profiles and Visitor Tracking

This guide will help you update your Supabase database to support user-specific profiles and visitor tracking for your interactive portfolio.

## Overview of Changes

1. Update the `profiles` table to include user authentication information
2. Update the `messages` table to include visitor identification
3. Set up appropriate security policies for these tables

## Step 1: Run the SQL Script in Supabase

1. Log in to your Supabase project at https://app.supabase.com/
2. Navigate to the SQL Editor in the left sidebar
3. Create a new query
4. Paste the following SQL script:

```sql
-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update profiles table to be user-specific
DROP TABLE IF EXISTS profiles;
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users, -- Link to Supabase Auth user
  bio TEXT NOT NULL DEFAULT 'I am a software engineer with a passion for building AI and web applications.',
  skills TEXT NOT NULL DEFAULT 'JavaScript, TypeScript, React, Node.js, Python, FastAPI, PostgreSQL',
  experience TEXT NOT NULL DEFAULT '5+ years of experience in full-stack development',
  projects TEXT NOT NULL DEFAULT 'AI-powered portfolio system, real-time analytics dashboard',
  interests TEXT NOT NULL DEFAULT 'AI, machine learning, web development',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update messages table to ensure it has visitor tracking fields
ALTER TABLE IF EXISTS messages
ADD COLUMN IF NOT EXISTS visitor_id TEXT DEFAULT 'anonymous',
ADD COLUMN IF NOT EXISTS visitor_name TEXT;

-- Create index for faster visitor filtering
CREATE INDEX IF NOT EXISTS idx_messages_visitor_id ON messages(visitor_id);

-- Ensure timestamps are properly formatted
ALTER TABLE IF EXISTS messages
  ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Allow anonymous read access to profiles" ON profiles;
DROP POLICY IF EXISTS "Allow service role to manage profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to manage profiles" ON profiles;
DROP POLICY IF EXISTS "Allow anonymous read access to messages" ON messages;
DROP POLICY IF EXISTS "Allow service role to manage messages" ON messages;
DROP POLICY IF EXISTS "Allow anon insert to messages" ON messages;
DROP POLICY IF EXISTS "Allow users to read their own messages" ON messages;
DROP POLICY IF EXISTS "Allow anonymous users to insert messages" ON messages;

-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
-- Allow anonymous read access to all profiles
CREATE POLICY "Allow anonymous read access to profiles" 
  ON profiles FOR SELECT 
  USING (true);
  
-- Allow users to manage their own profiles
CREATE POLICY "Allow users to manage their own profiles" 
  ON profiles FOR ALL 
  USING (auth.uid() = user_id);

-- Create policies for messages table
CREATE POLICY "Allow anonymous read access to messages" 
  ON messages FOR SELECT 
  USING (true);
  
CREATE POLICY "Allow anonymous users to insert messages" 
  ON messages FOR INSERT 
  WITH CHECK (true);

-- Grant access to the tables
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon, authenticated, service_role;

-- Create a trigger function to create a profile for new users
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Create a trigger to create a profile when a new user signs up
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_new_user();
```

5. Click "Run" to execute the script

## Step 2: Verify the Schema Changes

After running the SQL script:

1. Go to the "Table Editor" in the left sidebar
2. Check that the `profiles` table was updated with:
   - `id` (UUID)
   - `user_id` (UUID) - This links to Supabase Auth users
   - Various profile fields (bio, skills, experience, etc.)
   - `created_at` and `updated_at` timestamps

3. Check that the Row Level Security policies are properly set up:
   - In the "Authentication" section, go to "Policies"
   - Verify that the `profiles` table has the correct policies

## Step 3: Update Your Application

1. **Backend Changes**:
   - Restart your backend server to apply the changes to the models and database functions
   - The changes include visitor tracking in chat messages and user-specific profiles

2. **Frontend Changes**:
   - Run `npm install` in the frontend directory to install the new dependencies
   - Restart your frontend application

## Step 4: Test the New Features

1. **User Authentication**:
   - Navigate to the dashboard (previously "admin panel")
   - Sign up for a new account with your email and password
   - After logging in, you should be able to view and edit your personal profile information

2. **Visitor Tracking**:
   - Open the chat interface in a browser
   - Send some messages
   - Verify that the chat history is being logged with your visitor ID

## Troubleshooting

If you encounter issues:

1. **Schema didn't update properly**:
   ```sql
   -- Temporarily disable RLS for testing
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
   ```
   Remember to re-enable RLS when you're done testing:
   ```sql
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
   ```

2. **Check for existing profiles**:
   ```sql
   -- Check if profiles exist
   SELECT * FROM profiles;
   
   -- Check if your auth user exists
   SELECT * FROM auth.users;
   ```

## Additional Information

- This new schema allows each authenticated user to have their own profile that they can customize
- When visitors chat with the bot, they will see profile information from the bot's default profile
- In the future, you could extend this to link specific visitor sessions to specific user profiles 