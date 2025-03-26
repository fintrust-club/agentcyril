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
  bio TEXT NOT NULL,
  skills TEXT NOT NULL,
  experience TEXT NOT NULL,
  interests TEXT NOT NULL,
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

-- Create messages table with proper foreign keys
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id),
  visitor_id UUID REFERENCES visitors(id),
  message TEXT NOT NULL,
  response TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- Row-level security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Profiles table policies
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Projects table policies
CREATE POLICY "Projects are viewable by everyone" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Chatbots table policies
CREATE POLICY "Public chatbots are viewable by everyone" ON chatbots
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can update their own chatbots" ON chatbots
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chatbots" ON chatbots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chatbots" ON chatbots
  FOR DELETE USING (auth.uid() = user_id);

-- Visitors table policies
CREATE POLICY "Users can view visitors to their chatbots" ON visitors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN chatbots c ON m.chatbot_id = c.id
      WHERE m.visitor_id = visitors.id AND c.user_id = auth.uid()
    )
  );

-- Messages table policies
CREATE POLICY "Anyone can insert messages" ON messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view messages for their chatbots" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chatbots
      WHERE chatbots.id = messages.chatbot_id AND chatbots.user_id = auth.uid()
    )
  );

CREATE POLICY "Chatbot owners can update message read status" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chatbots
      WHERE chatbots.id = messages.chatbot_id AND chatbots.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM chatbots
      WHERE chatbots.id = messages.chatbot_id AND chatbots.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_chatbots_user_id ON chatbots(user_id);
CREATE INDEX idx_chatbots_public_url_slug ON chatbots(public_url_slug);
CREATE INDEX idx_messages_chatbot_id ON messages(chatbot_id);
CREATE INDEX idx_messages_visitor_id ON messages(visitor_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Add additional helper functions

-- Function to get all messages for a specific chatbot
CREATE OR REPLACE FUNCTION get_chatbot_messages(chatbot_id UUID, limit_val INTEGER DEFAULT 50)
RETURNS SETOF messages AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM messages
  WHERE messages.chatbot_id = get_chatbot_messages.chatbot_id
  ORDER BY created_at DESC
  LIMIT limit_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a chatbot by its public URL slug
CREATE OR REPLACE FUNCTION get_chatbot_by_slug(slug TEXT)
RETURNS chatbots AS $$
DECLARE
  chat_bot chatbots;
BEGIN
  SELECT *
  INTO chat_bot
  FROM chatbots
  WHERE public_url_slug = slug AND is_public = true;
  
  RETURN chat_bot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(chatbot_id_val UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE messages
  SET is_read = true
  WHERE chatbot_id = chatbot_id_val AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chatbots TO authenticated;
GRANT SELECT ON visitors TO authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;

-- Allow anon to view public chatbots and insert messages
GRANT SELECT ON chatbots TO anon;
GRANT INSERT ON messages TO anon;

-- Grant access to the helper functions
GRANT EXECUTE ON FUNCTION get_chatbot_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_chatbot_by_slug TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_as_read TO authenticated; 