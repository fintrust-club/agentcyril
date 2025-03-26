-- Migration scripts to transition from the current schema to the new multi-user schema
-- These scripts should be executed AFTER creating the new schema

-- Step 1: Create a temporary admin user to own migrated data
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Get or create an admin user to own the migrated data
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE email = 'admin@example.com' 
  LIMIT 1;
  
  IF admin_id IS NULL THEN
    RAISE NOTICE 'No admin user found. Please create one first and update this script.';
    -- You will need to handle user creation through Supabase Auth
  ELSE
    -- Insert the admin into our users table if not exists
    INSERT INTO users (id, username)
    VALUES (admin_id, 'admin')
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Using admin user with ID %', admin_id;
  END IF;
END
$$;

-- Step 2: Migrate existing profiles to the new schema
INSERT INTO profiles (
  id, 
  user_id, 
  name, 
  location, 
  bio, 
  skills, 
  experience, 
  interests, 
  created_at, 
  updated_at
)
SELECT 
  p.id,
  (SELECT id FROM users WHERE username = 'admin' LIMIT 1), -- assign to admin
  p.name,
  p.location,
  p.bio,
  p.skills,
  p.experience,
  p.interests,
  p.created_at,
  p.updated_at
FROM 
  profiles_old p
WHERE 
  NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p.id
  );

-- Step 3: Migrate existing projects to the new schema
INSERT INTO projects (
  id, 
  user_id,
  title, 
  description, 
  technologies, 
  image_url, 
  project_url, 
  is_featured, 
  created_at, 
  updated_at
)
SELECT 
  p.id,
  (SELECT id FROM users WHERE username = 'admin' LIMIT 1), -- assign to admin
  p.title,
  p.description,
  p.technologies,
  p.image_url,
  p.project_url,
  p.is_featured,
  p.created_at,
  p.updated_at
FROM 
  projects_old p
WHERE 
  NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p.id
  );

-- Step 4: Create default chatbot for each user
INSERT INTO chatbots (
  user_id,
  name,
  description,
  is_public,
  public_url_slug,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'My AI Assistant',
  'Personal AI assistant chatbot that knows about me and my projects',
  true,
  lower(u.username), -- Use lowercase username as URL slug
  NOW(),
  NOW()
FROM 
  users u
WHERE 
  NOT EXISTS (
    SELECT 1 FROM chatbots WHERE user_id = u.id
  );

-- Step 5: Create visitors table entries from existing messages
INSERT INTO visitors (
  visitor_id,
  name,
  first_seen,
  last_seen
)
SELECT DISTINCT
  m.visitor_id,
  m.visitor_name,
  MIN(m.created_at) OVER (PARTITION BY m.visitor_id),
  MAX(m.created_at) OVER (PARTITION BY m.visitor_id)
FROM
  messages_old m
WHERE
  m.visitor_id IS NOT NULL AND
  NOT EXISTS (
    SELECT 1 FROM visitors WHERE visitor_id = m.visitor_id
  );

-- Step 6: Migrate messages to new schema
INSERT INTO messages (
  id,
  chatbot_id,
  visitor_id,
  message,
  response,
  metadata,
  created_at
)
SELECT
  m.id,
  (SELECT id FROM chatbots WHERE user_id = (SELECT id FROM users WHERE username = 'admin' LIMIT 1) LIMIT 1), -- Default chatbot
  (SELECT id FROM visitors WHERE visitor_id = m.visitor_id),
  m.message,
  m.response,
  CASE 
    WHEN m.metadata IS NOT NULL THEN m.metadata::jsonb 
    ELSE '{}'::jsonb 
  END,
  m.created_at
FROM
  messages_old m
WHERE
  NOT EXISTS (
    SELECT 1 FROM messages WHERE id = m.id
  );

-- Step 7: Create helper view for message statistics
CREATE OR REPLACE VIEW message_stats AS
SELECT
  c.id AS chatbot_id,
  c.user_id,
  c.name AS chatbot_name,
  COUNT(m.id) AS total_messages,
  COUNT(DISTINCT m.visitor_id) AS unique_visitors,
  MAX(m.created_at) AS last_message_at
FROM
  chatbots c
LEFT JOIN
  messages m ON c.id = m.chatbot_id
GROUP BY
  c.id, c.user_id, c.name;

-- Step 8: Add function to generate a unique slug for chatbots
CREATE OR REPLACE FUNCTION generate_unique_slug(base_slug TEXT) 
RETURNS TEXT AS $$
DECLARE
  new_slug TEXT;
  counter INTEGER := 0;
  slug_exists BOOLEAN;
BEGIN
  -- Start with the base slug
  new_slug := base_slug;
  
  -- Check if it exists
  SELECT EXISTS(
    SELECT 1 FROM chatbots WHERE public_url_slug = new_slug
  ) INTO slug_exists;
  
  -- Keep generating new slugs until we find a unique one
  WHILE slug_exists LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
    
    SELECT EXISTS(
      SELECT 1 FROM chatbots WHERE public_url_slug = new_slug
    ) INTO slug_exists;
  END LOOP;
  
  RETURN new_slug;
END;
$$ LANGUAGE plpgsql; 