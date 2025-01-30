-- Drop existing profiles table if it exists
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table with username
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) PRIMARY KEY,
    username text UNIQUE NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    batch text NOT NULL,
    branch text NOT NULL,
    interests text[] DEFAULT array[]::text[],
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$')
);

-- Create index for username searches
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Create helper functions for username generation
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

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Allow username searches" ON profiles;
    
    CREATE POLICY "Users can view all profiles"
        ON profiles FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can update own profile"
        ON profiles FOR UPDATE
        USING (auth.uid() = id);
        
    CREATE POLICY "Allow username searches"
        ON profiles FOR SELECT
        USING (true);
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow username availability check" ON public.profiles;

-- Create a policy to allow username availability checks without authentication
CREATE POLICY "Allow username availability check" ON public.profiles
FOR SELECT
USING (true);

-- Create a function to check username availability
CREATE OR REPLACE FUNCTION public.check_username_availability(username_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = username_to_check
  );
END;
$$; 