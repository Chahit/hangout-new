-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Modify the handle_new_user function to be more resilient
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    username_base text;
    final_username text;
    user_name text;
BEGIN
    -- Add exception handling
    BEGIN
        -- Generate base username from email
        username_base := COALESCE(
            generate_base_username(new.email),
            'user' || floor(random() * 1000000)::text
        );
        
        -- Get unique username
        final_username := generate_unique_username(username_base);
        
        -- Get name from metadata or email
        user_name := COALESCE(
            new.raw_user_meta_data->>'name',
            split_part(new.email, '@', 1),
            'New User'
        );
        
        -- Insert with more permissive defaults
        INSERT INTO public.profiles (
            id,
            email,
            name,
            username,
            batch,
            branch,
            interests,
            notification_preferences,
            privacy_settings,
            updated_at
        )
        VALUES (
            new.id,
            COALESCE(new.email, ''),
            user_name,
            final_username,
            COALESCE(new.raw_user_meta_data->>'batch', ''),
            COALESCE(new.raw_user_meta_data->>'branch', ''),
            array[]::text[],
            jsonb_build_object(
                'email_notifications', true,
                'dating_notifications', true,
                'group_notifications', true,
                'event_notifications', true,
                'support_notifications', true
            ),
            jsonb_build_object(
                'show_online_status', true,
                'show_last_seen', true,
                'show_email', true,
                'show_batch', true,
                'show_branch', true
            ),
            now()
        );
        
        RETURN new;
    EXCEPTION WHEN OTHERS THEN
        -- Log the error (this will appear in Supabase logs)
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        -- Still return new to allow user creation even if profile creation fails
        RETURN new;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role; 