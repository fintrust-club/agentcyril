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
print("Setting up Agent Ciril database in Supabase...")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Check if profiles table exists, and if not, attempt to create it
try:
    # Try to get one row from profiles table to check if it exists
    response = supabase.table("profiles").select("*").limit(1).execute()
    print("Profiles table exists")
except Exception as e:
    if "relation" in str(e) and "does not exist" in str(e):
        print("Profiles table doesn't exist, creating...")
        # We can't execute raw SQL through REST API, so we'll manually create a profile
        try:
            # Create an initial profile
            response = supabase.table("profiles").insert({
                "bio": "I am a software engineer with a passion for building AI and web applications. I specialize in full-stack development and have experience across the entire development lifecycle.",
                "skills": "JavaScript, TypeScript, React, Node.js, Python, FastAPI, PostgreSQL, ChromaDB, Supabase, Next.js, TailwindCSS",
                "experience": "5+ years of experience in full-stack development, with a focus on building AI-powered applications and responsive web interfaces.",
                "projects": "AI-powered portfolio system, real-time analytics dashboard, natural language processing application",
                "interests": "AI, machine learning, web development, reading sci-fi, hiking"
            }).execute()
            print("Created initial profile")
        except Exception as create_e:
            print(f"Error creating profile: {create_e}")
    else:
        print(f"Error checking profiles table: {e}")

# Check if messages table exists
try:
    # Try to get one row from messages table to check if it exists
    response = supabase.table("messages").select("*").limit(1).execute()
    print("Messages table exists")
except Exception as e:
    if "relation" in str(e) and "does not exist" in str(e):
        print("Messages table doesn't exist, creating...")
        try:
            # Create an initial message
            response = supabase.table("messages").insert({
                "message": "Hello, Agent Ciril!",
                "sender": "system",
                "response": "Hi! I'm Agent Ciril. How can I help you today?"
            }).execute()
            print("Created initial message")
        except Exception as create_e:
            print(f"Error creating message: {create_e}")
    else:
        print(f"Error checking messages table: {e}")

print("Database setup complete") 