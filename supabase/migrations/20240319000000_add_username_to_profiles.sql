-- Add username column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index for username searches
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Update RLS policies to allow username searches
CREATE POLICY "Allow username searches"
    ON profiles FOR SELECT
    USING (true);

-- Create function to generate unique username
CREATE OR REPLACE FUNCTION generate_unique_username(base_username TEXT)
RETURNS TEXT AS $$
DECLARE
    new_username TEXT;
    counter INTEGER := 0;
BEGIN
    -- Try the base username first
    new_username := base_username;
    
    -- Keep trying with incrementing numbers until we find a unique username
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = new_username) LOOP
        counter := counter + 1;
        new_username := base_username || counter;
    END LOOP;
    
    RETURN new_username;
END;
$$ LANGUAGE plpgsql; 