-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table to store authentication information
-- This extends the built-in Supabase auth.users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table with user_id as primary key
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT,
  location TEXT,
  bio TEXT NOT NULL DEFAULT 'No bio available yet.',
  skills TEXT NOT NULL DEFAULT 'No skills listed yet.',
  experience TEXT NOT NULL DEFAULT 'No experience listed yet.',
  interests TEXT NOT NULL DEFAULT 'No interests listed yet.',
  projects TEXT DEFAULT '[]', -- Store project_list as a JSON string
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add a unique constraint on user_id to ensure one profile per user
  UNIQUE(user_id)
);

-- Create projects table with foreign key to profiles
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  technologies TEXT,
  image_url TEXT,
  project_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chatbots table to define chatbots owned by users
CREATE TABLE IF NOT EXISTS chatbots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  configuration JSONB DEFAULT '{}'::jsonb,
  public_url_slug TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create visitors table to track visitors to chatbots
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table with proper foreign keys AND THE CRITICAL VISITOR_ID_TEXT COLUMN
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID REFERENCES chatbots(id), -- Make this nullable
  visitor_id UUID REFERENCES visitors(id),
  visitor_id_text TEXT, -- CRITICAL: This column is used by the chat system
  target_user_id UUID, -- For backward compatibility
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- For backward compatibility
  message TEXT NOT NULL,
  response TEXT,
  sender TEXT DEFAULT 'user', -- Add sender column for clarity
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- DISABLE Row-level security (RLS) policies FOR TESTING
-- Enable these later for production
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE chatbots DISABLE ROW LEVEL SECURITY;
ALTER TABLE visitors DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Grant ALL permissions to anonymous users for testing
GRANT ALL ON messages TO anon;
GRANT ALL ON visitors TO anon;
GRANT ALL ON chatbots TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbots_user_id ON chatbots(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbots_public_url_slug ON chatbots(public_url_slug);
CREATE INDEX IF NOT EXISTS idx_messages_chatbot_id ON messages(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_messages_visitor_id ON messages(visitor_id);
CREATE INDEX IF NOT EXISTS idx_messages_visitor_id_text ON messages(visitor_id_text);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- Function to get the default chatbot ID
CREATE OR REPLACE FUNCTION get_default_chatbot_id() 
RETURNS UUID AS $$
DECLARE
  default_id UUID;
BEGIN
  SELECT id INTO default_id FROM chatbots LIMIT 1;
  RETURN default_id;
END;
$$ LANGUAGE plpgsql;

-- Update the function to handle null chatbot_id
CREATE OR REPLACE FUNCTION handle_missing_chatbot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chatbot_id IS NULL THEN
    NEW.chatbot_id := get_default_chatbot_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add chatbot_id if missing
DROP TRIGGER IF EXISTS ensure_chatbot_id ON messages;
CREATE TRIGGER ensure_chatbot_id
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_missing_chatbot();

-- Ensure a default chatbot exists
DO $$
DECLARE
  default_user_id UUID;
BEGIN
  -- Get first user or create a dummy one
  SELECT id INTO default_user_id FROM users LIMIT 1;
  
  IF default_user_id IS NULL THEN
    -- Create a dummy user if no users exist
    INSERT INTO users (id, username, created_at, updated_at)
    VALUES (
      uuid_generate_v4(), 
      'default_user', 
      NOW(), 
      NOW()
    )
    RETURNING id INTO default_user_id;
  END IF;
  
  -- Create a default chatbot if none exists
  IF NOT EXISTS (SELECT 1 FROM chatbots LIMIT 1) THEN
    INSERT INTO chatbots (
      id,
      user_id,
      name,
      description,
      is_public,
      public_url_slug,
      created_at,
      updated_at
    )
    VALUES (
      uuid_generate_v4(),
      default_user_id,
      'Default Chatbot',
      'Default chatbot for the system',
      true,
      'default',
      NOW(),
      NOW()
    );
  END IF;
END
$$;

-- Force cache refresh
NOTIFY pgrst, 'reload config'; 