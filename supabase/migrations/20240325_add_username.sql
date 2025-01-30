-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index for username search
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);

-- Update RLS policies to allow username search
CREATE POLICY "Allow username search" 
ON public.profiles 
FOR SELECT 
USING (true); 