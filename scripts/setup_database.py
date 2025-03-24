#!/usr/bin/env python3
"""
Setup script for creating necessary tables in Supabase
"""
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv("../backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in ../backend/.env")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# SQL statements to create tables
SQL_CREATE_PROFILES_TABLE = """
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bio TEXT NOT NULL,
    skills TEXT NOT NULL,
    experience TEXT NOT NULL,
    projects TEXT NOT NULL,
    interests TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a trigger to update the updated_at field
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
"""

SQL_CREATE_MESSAGES_TABLE = """
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    sender TEXT NOT NULL,
    response TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);
"""

# SQL to enable vector extension (if needed)
SQL_ENABLE_VECTOR = """
-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;
"""

def create_tables():
    try:
        # Enable vector extension
        print("Enabling pgvector extension...")
        supabase.postgrest.rpc('pg_query', {'query': SQL_ENABLE_VECTOR}).execute()
        
        # Create profiles table
        print("Creating profiles table...")
        supabase.postgrest.rpc('pg_query', {'query': SQL_CREATE_PROFILES_TABLE}).execute()
        
        # Create messages table
        print("Creating messages table...")
        supabase.postgrest.rpc('pg_query', {'query': SQL_CREATE_MESSAGES_TABLE}).execute()
        
        print("Database setup completed successfully!")
        return True
    except Exception as e:
        print(f"Error setting up database: {e}")
        return False

if __name__ == "__main__":
    print("Setting up Agent Ciril database in Supabase...")
    success = create_tables()
    sys.exit(0 if success else 1) 