-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bio TEXT NOT NULL,
  skills TEXT NOT NULL,
  experience TEXT NOT NULL,
  projects TEXT NOT NULL,
  interests TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  sender TEXT NOT NULL,
  response TEXT,
  visitor_id TEXT NOT NULL DEFAULT 'anonymous',
  visitor_name TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create initial profile entry if not exists
INSERT INTO profiles (bio, skills, experience, projects, interests)
SELECT 
  'I am a software engineer with a passion for building AI and web applications. I specialize in full-stack development and have experience across the entire development lifecycle.',
  'JavaScript, TypeScript, React, Node.js, Python, FastAPI, PostgreSQL, ChromaDB, Supabase, Next.js, TailwindCSS',
  '5+ years of experience in full-stack development, with a focus on building AI-powered applications and responsive web interfaces.',
  'AI-powered portfolio system, real-time analytics dashboard, natural language processing application',
  'AI, machine learning, web development, reading sci-fi, hiking'
WHERE NOT EXISTS (SELECT 1 FROM profiles LIMIT 1);

-- Create initial admin user (password should be changed after first login)
-- Default password: admin123 (change this immediately)
INSERT INTO admin_users (username, password_hash)
SELECT 
  'admin',
  -- This is a placeholder hash - in production, use proper password hashing
  'admin123'
WHERE NOT EXISTS (SELECT 1 FROM admin_users LIMIT 1);

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Allow anonymous read access to profiles" ON profiles;
DROP POLICY IF EXISTS "Allow service role to manage profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to manage profiles" ON profiles;
DROP POLICY IF EXISTS "Allow anonymous read access to messages" ON messages;
DROP POLICY IF EXISTS "Allow service role to manage messages" ON messages;
DROP POLICY IF EXISTS "Allow anon insert to messages" ON messages;
DROP POLICY IF EXISTS "Allow users to read their own messages" ON messages;
DROP POLICY IF EXISTS "Allow anonymous users to insert messages" ON messages;
DROP POLICY IF EXISTS "Allow admin users to authenticate" ON admin_users;

-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Allow anonymous read access to profiles" 
  ON profiles FOR SELECT 
  USING (true);
  
CREATE POLICY "Allow authenticated users to manage profiles" 
  ON profiles FOR ALL 
  USING (true);

-- Create policies for messages table
CREATE POLICY "Allow anonymous read access to messages" 
  ON messages FOR SELECT 
  USING (true);
  
CREATE POLICY "Allow anonymous users to insert messages" 
  ON messages FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow users to read their own messages" 
  ON messages FOR SELECT 
  USING (true);

-- Create policies for admin_users table
CREATE POLICY "Allow admin users to authenticate"
  ON admin_users FOR SELECT
  USING (true);

-- Grant access to the tables
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon, authenticated, service_role;
GRANT SELECT ON admin_users TO anon, authenticated, service_role;

-- Update messages table with visitor identification
ALTER TABLE IF EXISTS messages
ADD COLUMN IF NOT EXISTS visitor_id TEXT DEFAULT 'anonymous',
ADD COLUMN IF NOT EXISTS visitor_name TEXT;

-- Create index for faster visitor filtering
CREATE INDEX IF NOT EXISTS idx_messages_visitor_id ON messages(visitor_id);

-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a default admin user (password: admin123)
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', 'admin123')
ON CONFLICT (username) DO NOTHING;

-- Create appropriate security policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for messages table
DROP POLICY IF EXISTS "Allow public read access to messages" ON messages;
CREATE POLICY "Allow public read access to messages" ON messages
    FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Allow public insert access to messages" ON messages;
CREATE POLICY "Allow public insert access to messages" ON messages
    FOR INSERT
    WITH CHECK (true);

-- Create policy for admin_users table
DROP POLICY IF EXISTS "Admin users can only view their own data" ON admin_users;
CREATE POLICY "Admin users can only view their own data" ON admin_users
    FOR SELECT
    USING (auth.uid() = id);

-- Make sure extension for UUID is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure timestamps are properly formatted
ALTER TABLE IF EXISTS messages
  ALTER COLUMN timestamp TYPE TIMESTAMP WITH TIME ZONE; 