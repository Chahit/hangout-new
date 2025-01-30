-- Drop the updated_at column if it exists (to ensure clean state)
ALTER TABLE public.dating_profiles 
DROP COLUMN IF EXISTS updated_at;

-- Add updated_at column with proper default
ALTER TABLE public.dating_profiles 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS set_updated_at ON public.dating_profiles;

-- Create the trigger
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.dating_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 