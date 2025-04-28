-- Fix permissions for notes table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_manage_own_notes" ON "notes";
DROP POLICY IF EXISTS "service_role_manage_all_notes" ON "notes";

-- Create a proper policy for authenticated users
CREATE POLICY "user_manage_own_notes" 
ON "notes"
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- IMPORTANT: Add policy for service role to manage all notes
-- This allows the backend API (using service role key) to bypass RLS for notes
CREATE POLICY "service_role_manage_all_notes" 
ON "notes"
FOR ALL 
TO service_role
USING (true);
 
-- Check if the Supabase JWT secret is properly set on the backend
-- Compare the value in .env with the actual JWT secret in the Supabase dashboard

-- ========================
-- DROP EXISTING TRIGGERS
-- ========================
DROP TRIGGER IF EXISTS "update_notes_updated_at" ON "notes";
DROP TRIGGER IF EXISTS "log_note_inserts" ON "notes";

-- ========================
-- DROP EXISTING FUNCTIONS (Only if safe to do so)
-- ========================
-- Uncomment if needed and if function is not used by other tables
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP FUNCTION IF EXISTS log_note_inserts();

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger for updating updated_at column
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Make sure default values are set
ALTER TABLE notes
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now();

-- Important: Make sure the notes_user_id_fkey constraint is correct
-- If the auth.users IDs are not synced with public.users, this may need adjustment
-- A more permissive approach would be to make the constraint deferrable or remove it

-- Optional: Log any note inserts (for debugging)
CREATE OR REPLACE FUNCTION log_note_inserts()
RETURNS TRIGGER AS $$
BEGIN
    -- This will appear in Supabase logs
    RAISE NOTICE 'Note insert: user_id=%, content_length=%', NEW.user_id, length(NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for logging note inserts
CREATE TRIGGER log_note_inserts
BEFORE INSERT ON notes
FOR EACH ROW
EXECUTE FUNCTION log_note_inserts(); 