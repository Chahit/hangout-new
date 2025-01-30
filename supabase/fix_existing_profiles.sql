-- Update existing profiles with default values
UPDATE public.profiles
SET 
    batch = COALESCE(batch, '2022'),
    branch = COALESCE(branch, 'CSE'),
    interests = COALESCE(interests, array[]::text[])
WHERE 
    batch IS NULL 
    OR branch IS NULL 
    OR interests IS NULL; 