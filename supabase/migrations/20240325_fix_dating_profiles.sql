-- Add answers column to dating_profiles table
ALTER TABLE public.dating_profiles 
ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;

-- Add has_completed_profile column if it doesn't exist
ALTER TABLE public.dating_profiles 
ADD COLUMN IF NOT EXISTS has_completed_profile BOOLEAN DEFAULT false;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.dating_profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_dating_profiles_updated_at ON dating_profiles;
CREATE TRIGGER update_dating_profiles_updated_at
    BEFORE UPDATE ON dating_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 