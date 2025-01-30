-- First, add the username column without the NOT NULL constraint
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username text;

-- Create unique index for usernames
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Create function to generate a base username from email
CREATE OR REPLACE FUNCTION generate_base_username(email text)
RETURNS text AS $$
DECLARE
    base_username text;
BEGIN
    -- Extract the part before @ and remove any non-alphanumeric characters
    base_username := regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9]', '', 'g');
    RETURN lower(base_username);
END;
$$ LANGUAGE plpgsql;

-- Create function to ensure username uniqueness
CREATE OR REPLACE FUNCTION generate_unique_username(base_username text)
RETURNS text AS $$
DECLARE
    new_username text;
    counter integer := 0;
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

-- Generate usernames for existing profiles
DO $$
DECLARE
    profile_record RECORD;
BEGIN
    FOR profile_record IN SELECT id, email FROM profiles WHERE username IS NULL LOOP
        UPDATE profiles
        SET username = generate_unique_username(generate_base_username(profile_record.email))
        WHERE id = profile_record.id;
    END LOOP;
END $$;

-- Now make the username column NOT NULL
ALTER TABLE public.profiles
ALTER COLUMN username SET NOT NULL;

-- Add constraint to ensure username format
ALTER TABLE public.profiles
ADD CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$');

-- Create policy to allow username searches
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow username searches" ON profiles;
    
    CREATE POLICY "Allow username searches"
        ON profiles FOR SELECT
        USING (true);
END $$; 