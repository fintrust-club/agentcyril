-- Create a test user, profile, and chatbot for testing public chat endpoints
-- Run this script in the Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set test user ID 
DO $$
DECLARE
    test_user_id UUID := '4f7c12fe-f4a1-4828-b52c-b7c329e5a2cb'; -- Fixed UUID for testing
    chatbot_id UUID;
    profile_id UUID;
BEGIN
    -- Create test user if it doesn't exist
    INSERT INTO auth.users (
        id, 
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        role,
        confirmation_token,
        recovery_token
    )
    VALUES (
        test_user_id,
        'test@example.com',
        '$2a$10$VgDU40KhsIJDuQilHGVKveCX4lP8UQZArjZxPZJxyBGbVSQY5C5xq', -- This is 'password'
        NOW(),
        NOW(),
        NOW(),
        'authenticated',
        '',
        ''
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create user record in public schema
    INSERT INTO public.users (
        id,
        username,
        created_at,
        updated_at
    )
    VALUES (
        test_user_id,
        'test_user',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create profile for test user
    INSERT INTO public.profiles (
        user_id,
        name,
        bio,
        skills,
        experience,
        interests,
        location,
        projects,
        project_list,
        created_at,
        updated_at
    )
    VALUES (
        test_user_id,
        'John Doe',
        'I am John, a software engineer with a passion for AI and web development.',
        'Python, JavaScript, React, Machine Learning',
        '5+ years in software development',
        'AI, web development, hiking',
        'San Francisco, CA',
        '[]',
        '[]'::jsonb,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        name = EXCLUDED.name,
        bio = EXCLUDED.bio,
        updated_at = NOW()
    RETURNING id INTO profile_id;
    
    -- Create chatbot for test user
    INSERT INTO public.chatbots (
        user_id,
        name,
        description,
        is_public,
        public_url_slug,
        created_at,
        updated_at
    )
    VALUES (
        test_user_id,
        'John''s Assistant',
        'A helpful AI assistant for John',
        TRUE,
        'john-test-bot',
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, name) DO UPDATE
    SET 
        description = EXCLUDED.description,
        is_public = TRUE,
        updated_at = NOW()
    RETURNING id INTO chatbot_id;
    
    -- Output results
    RAISE NOTICE 'Created test user with ID: %', test_user_id;
    RAISE NOTICE 'Created profile with ID: %', profile_id;
    RAISE NOTICE 'Created chatbot with ID: %', chatbot_id;
END $$; 