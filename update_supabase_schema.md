# Updating Your Supabase Schema for Visitor Tracking

This guide will help you update your Supabase database to support visitor tracking and admin authentication for your interactive portfolio.

## Overview of Changes

1. Update the `messages` table to include visitor identification
2. Create an `admin_users` table for admin authentication
3. Set up appropriate security policies

## Step 1: Run the SQL Script in Supabase

1. Log in to your Supabase project at https://app.supabase.com/
2. Navigate to the SQL Editor in the left sidebar
3. Create a new query
4. Paste the contents of the `create_supabase_tables.sql` file
5. Click "Run" to execute the script

> **Note**: This will create the necessary tables and modify existing ones. If you encounter errors, you may need to drop the existing tables first.

## Step 2: Verify the Schema Changes

After running the SQL script:

1. Go to the "Table Editor" in the left sidebar
2. Check that the `messages` table now has `visitor_id` and `visitor_name` columns
3. Verify that the `admin_users` table was created with:
   - `id` (UUID)
   - `username` (TEXT)
   - `password_hash` (TEXT)
   - `created_at` (TIMESTAMP)

## Step 3: Update Your Application

1. **Backend Changes**:
   - Restart your backend server to apply the changes to the models and database functions
   - The changes include visitor tracking in chat messages and admin authentication

2. **Frontend Changes**:
   - Run `npm install` in the frontend directory to install the new dependencies
   - Restart your frontend application

## Step 4: Test the New Features

1. **Visitor Tracking**:
   - Open the chat interface in a browser
   - You should see a prompt to set your name
   - Send some messages
   - Open the chat in a different browser (or incognito mode)
   - Verify that the chat history is different for each "visitor"

2. **Admin Authentication**:
   - Navigate to `/admin`
   - You should see a login screen
   - Use the default credentials:
     - Username: `admin`
     - Password: `admin123`
   - After login, you should see the admin panel

## Step 5: Change the Default Admin Password

For security reasons, you should change the default admin password:

1. Go to the "Table Editor" in Supabase
2. Open the `admin_users` table
3. Find the row with username `admin`
4. Update the `password_hash` field with a secure password

> **Important**: In a production application, you should use proper password hashing instead of storing passwords as plain text. This implementation is simplified for demonstration purposes.

## Troubleshooting

If you encounter issues:

1. Check the browser console for error messages
2. Verify that your backend server logs show successful connections to Supabase
3. Ensure that all environment variables are set correctly in both frontend and backend
4. If tables already exist, you may need to drop them before recreating them with the new schema 