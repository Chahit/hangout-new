-- Add email column to profiles table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'email'
    ) THEN 
        ALTER TABLE profiles ADD COLUMN email TEXT;
        
        -- Update existing profiles with email from auth.users
        UPDATE profiles 
        SET email = users.email 
        FROM auth.users 
        WHERE profiles.id = users.id;
        
        -- Make email column NOT NULL after populating data
        ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;
    END IF;
END $$; 