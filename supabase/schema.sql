-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

------------------------------------------
-- Auth Schema Setup
------------------------------------------

-- Create auth schema
CREATE SCHEMA IF NOT EXISTS auth;
ALTER SCHEMA auth OWNER TO supabase_admin;

-- Create auth.users table with proper structure
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text,
    raw_user_meta_data jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    aud varchar(255),
    role varchar(255),
    last_sign_in_at timestamp with time zone,
    CONSTRAINT users_email_key UNIQUE (email)
);

-- Create auth.sessions table
CREATE TABLE IF NOT EXISTS auth.sessions (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    factor_id uuid,
    aal aal_level,
    not_after timestamp with time zone
);

-- Create auth.flow_state table for OAuth and email flows
CREATE TABLE IF NOT EXISTS auth.flow_state (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id),
    auth_code text,
    code_challenge_method text,
    code_challenge text,
    provider_type text,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    authentication_method text
);

-- Create auth.identities table for social logins
CREATE TABLE IF NOT EXISTS auth.identities (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    identity_data jsonb,
    provider text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_sign_in_at timestamp with time zone,
    CONSTRAINT identities_unique_provider_user UNIQUE (provider, user_id)
);

-- Create indexes for auth tables
CREATE INDEX IF NOT EXISTS auth_users_email_idx ON auth.users(email);
CREATE INDEX IF NOT EXISTS auth_users_created_at_idx ON auth.users(created_at DESC);
CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_not_after_idx ON auth.sessions(not_after DESC);
CREATE INDEX IF NOT EXISTS auth_flow_state_user_id_idx ON auth.flow_state(user_id);
CREATE INDEX IF NOT EXISTS auth_flow_state_created_at_idx ON auth.flow_state(created_at DESC);
CREATE INDEX IF NOT EXISTS auth_identities_user_id_idx ON auth.identities(user_id);

------------------------------------------
-- Base Tables
------------------------------------------

-- First, create a temporary table to backup existing profiles
DO $$ 
BEGIN
    -- Create temporary table for profiles backup
    CREATE TEMP TABLE IF NOT EXISTS profiles_backup AS 
    SELECT * FROM public.profiles;
    
    -- Drop all tables in correct order
    DROP TABLE IF EXISTS public.event_participants CASCADE;
    DROP TABLE IF EXISTS public.events CASCADE;
    DROP TABLE IF EXISTS public.messages CASCADE;
    DROP TABLE IF EXISTS public.group_messages CASCADE;
    DROP TABLE IF EXISTS public.group_members CASCADE;
    DROP TABLE IF EXISTS public.groups CASCADE;
    DROP TABLE IF EXISTS public.dating_profiles CASCADE;
    DROP TABLE IF EXISTS public.dating_connections CASCADE;
    DROP TABLE IF EXISTS public.confessions CASCADE;
    DROP TABLE IF EXISTS public.confession_comments CASCADE;
    DROP TABLE IF EXISTS public.confession_likes CASCADE;
    DROP TABLE IF EXISTS public.memes CASCADE;
    DROP TABLE IF EXISTS public.meme_comments CASCADE;
    DROP TABLE IF EXISTS public.meme_likes CASCADE;
    DROP TABLE IF EXISTS public.support_posts CASCADE;
    DROP TABLE IF EXISTS public.support_responses CASCADE;
    DROP TABLE IF EXISTS public.notifications CASCADE;
    DROP TABLE IF EXISTS public.direct_messages CASCADE;
    DROP TABLE IF EXISTS public.profiles CASCADE;
END $$;

-- Create profiles table first (core user data)
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) PRIMARY KEY,
    username text UNIQUE NOT NULL,
    name text NOT NULL DEFAULT '',
    email text NOT NULL DEFAULT '',
    batch text DEFAULT '',
    branch text DEFAULT '',
    interests text[] DEFAULT array[]::text[],
    notification_preferences JSONB DEFAULT jsonb_build_object(
        'email_notifications', true,
        'dating_notifications', true,
        'group_notifications', true,
        'event_notifications', true,
        'support_notifications', true
    ),
    privacy_settings JSONB DEFAULT jsonb_build_object(
        'show_online_status', true,
        'show_last_seen', true,
        'show_email', true,
        'show_batch', true,
        'show_branch', true
    ),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$')
);

-- Restore profiles from backup
DO $$
BEGIN
    INSERT INTO public.profiles
    SELECT * FROM profiles_backup
    ON CONFLICT (id) DO UPDATE
    SET 
        username = EXCLUDED.username,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        batch = EXCLUDED.batch,
        branch = EXCLUDED.branch,
        interests = EXCLUDED.interests,
        notification_preferences = EXCLUDED.notification_preferences,
        privacy_settings = EXCLUDED.privacy_settings,
        updated_at = EXCLUDED.updated_at;
    
    -- Drop the temporary backup table
    DROP TABLE IF EXISTS profiles_backup;
EXCEPTION
    WHEN undefined_table THEN
        -- If backup table doesn't exist, that's fine
        NULL;
END $$;

-- Create direct_messages table right after profiles
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    message_type TEXT CHECK (message_type IN ('regular', 'dating')) DEFAULT 'regular',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at timestamp with time zone,
    reactions jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false NOT NULL,
    CONSTRAINT sender_recipient_different CHECK (sender_id != recipient_id)
);

-- Enable RLS for direct_messages
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for direct_messages
CREATE POLICY "Users can view their messages"
    ON public.direct_messages
    FOR SELECT
    TO authenticated
    USING (auth.uid() IN (sender_id, recipient_id));

CREATE POLICY "Users can send messages"
    ON public.direct_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update messages"
    ON public.direct_messages
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = recipient_id);

-- Create indexes for direct_messages
CREATE INDEX IF NOT EXISTS direct_messages_sender_recipient_idx ON public.direct_messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS direct_messages_type_idx ON public.direct_messages(message_type);
CREATE INDEX IF NOT EXISTS direct_messages_created_at_idx ON public.direct_messages(created_at DESC);

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

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
    
    -- Allow anyone to view profiles
    CREATE POLICY "Users can view all profiles"
        ON profiles FOR SELECT
        USING (true);
    
    -- Allow users to update their own profile
    CREATE POLICY "Users can update own profile"
        ON profiles FOR UPDATE
        USING (auth.uid() = id);

    -- Allow authenticated users to insert profiles
    CREATE POLICY "Enable insert for authenticated users only"
        ON profiles FOR INSERT
        WITH CHECK (true);
END $$;

-- Create a trigger to create a profile when a user signs up
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

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create dating_profiles table with essential fields
CREATE TABLE IF NOT EXISTS public.dating_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    gender text CHECK (gender IN ('male', 'female')) NOT NULL,
    looking_for text CHECK (looking_for IN ('male', 'female')) NOT NULL,
    bio text,
    interests text[] DEFAULT array[]::text[],
    answers JSONB DEFAULT '{}'::jsonb,
    has_completed_profile BOOLEAN DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create or replace the trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for dating_profiles
DROP TRIGGER IF EXISTS set_dating_profiles_updated_at ON public.dating_profiles;
CREATE TRIGGER set_dating_profiles_updated_at
    BEFORE UPDATE ON public.dating_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create dating_connections table for matches
CREATE TABLE IF NOT EXISTS public.dating_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(from_user_id, to_user_id)
);

-- Add type column to existing direct_messages table for dating messages
ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT CHECK (message_type IN ('regular', 'dating')) DEFAULT 'regular';

-- Enable Row Level Security
ALTER TABLE public.dating_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dating_connections ENABLE ROW LEVEL SECURITY;

-- Policies for dating_profiles
CREATE POLICY "Users can view their own dating profile"
    ON public.dating_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dating profile"
    ON public.dating_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dating profile"
    ON public.dating_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Policies for dating_connections
CREATE POLICY "Users can view their connections"
    ON public.dating_connections
    FOR SELECT
    TO authenticated
    USING (auth.uid() IN (from_user_id, to_user_id));

CREATE POLICY "Users can create connections"
    ON public.dating_connections
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update their received connections"
    ON public.dating_connections
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = to_user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS dating_profiles_user_id_idx ON public.dating_profiles(user_id);
CREATE INDEX IF NOT EXISTS dating_profiles_gender_idx ON public.dating_profiles(gender);
CREATE INDEX IF NOT EXISTS dating_profiles_looking_for_idx ON public.dating_profiles(looking_for);
CREATE INDEX IF NOT EXISTS dating_profiles_completed_idx ON public.dating_profiles(has_completed_profile);
CREATE INDEX IF NOT EXISTS dating_connections_from_user_idx ON public.dating_connections(from_user_id);
CREATE INDEX IF NOT EXISTS dating_connections_to_user_idx ON public.dating_connections(to_user_id);
CREATE INDEX IF NOT EXISTS dating_connections_status_idx ON public.dating_connections(status);

------------------------------------------
-- Groups System
------------------------------------------


-- First, drop existing tables in the correct order
-- Drop existing tables to avoid conflicts
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.group_members;
DROP TABLE IF EXISTS public.groups;

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    code text UNIQUE,
    is_private boolean DEFAULT false NOT NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role text CHECK (role IN ('member', 'moderator', 'admin')) NOT NULL DEFAULT 'member',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, user_id)
);

-- Create messages table with simplified schema
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content text NOT NULL,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies with ultra-simplified logic
DO $$ 
BEGIN
    -- Drop all existing policies
    DROP POLICY IF EXISTS "Groups read access" ON groups;
    DROP POLICY IF EXISTS "Groups insert access" ON groups;
    DROP POLICY IF EXISTS "Groups update access" ON groups;
    DROP POLICY IF EXISTS "Groups delete access" ON groups;
    DROP POLICY IF EXISTS "Group members read access" ON group_members;
    DROP POLICY IF EXISTS "Group members insert access" ON group_members;
    DROP POLICY IF EXISTS "Group members update access" ON group_members;
    DROP POLICY IF EXISTS "Group members delete access" ON group_members;
    DROP POLICY IF EXISTS "Messages read access" ON messages;
    DROP POLICY IF EXISTS "Messages insert access" ON messages;
    DROP POLICY IF EXISTS "Messages update access" ON messages;
    DROP POLICY IF EXISTS "Messages delete access" ON messages;

    -- Groups policies
    CREATE POLICY "Groups read access"
        ON groups FOR SELECT
        TO authenticated
        USING (true); -- Allow all authenticated users to see all groups
    
    CREATE POLICY "Groups insert access"
        ON groups FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);
    
    CREATE POLICY "Groups update access"
        ON groups FOR UPDATE
        TO authenticated
        USING (created_by = auth.uid());
    
    CREATE POLICY "Groups delete access"
        ON groups FOR DELETE
        TO authenticated
        USING (created_by = auth.uid());

    -- Group members policies (ultra-simplified)
    CREATE POLICY "Group members read access"
        ON group_members FOR SELECT
        TO authenticated
        USING (true);
    
    CREATE POLICY "Group members insert access"
        ON group_members FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM groups
                WHERE id = group_members.group_id
                AND created_by = auth.uid()
            )
        );
    
    CREATE POLICY "Group members update access"
        ON group_members FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM groups
                WHERE id = group_members.group_id
                AND created_by = auth.uid()
            )
        );
    
    CREATE POLICY "Group members delete access"
        ON group_members FOR DELETE
        TO authenticated
        USING (
            user_id = auth.uid() -- Users can remove themselves
            OR EXISTS (
                SELECT 1 FROM groups
                WHERE id = group_members.group_id
                AND created_by = auth.uid()
            )
        );

    -- Messages policies (ultra-simplified)
    CREATE POLICY "Messages read access"
        ON messages FOR SELECT
        TO authenticated
        USING (true);
    
    CREATE POLICY "Messages insert access"
        ON messages FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);
    
    CREATE POLICY "Messages update access"
        ON messages FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid());
    
    CREATE POLICY "Messages delete access"
        ON messages FOR DELETE
        TO authenticated
        USING (user_id = auth.uid());
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS groups_created_by_idx ON groups(created_by);
CREATE INDEX IF NOT EXISTS groups_code_idx ON groups(code);
CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON group_members(group_id);
CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON group_members(user_id);
CREATE INDEX IF NOT EXISTS messages_group_id_idx ON messages(group_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC); 
------------------------------------------
-- Messaging System
------------------------------------------
------------------------------------------
-- Update Messaging System
------------------------------------------

-- First, drop existing tables to avoid conflicts
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.direct_messages CASCADE;

-- Create messages table for group messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  reactions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create direct messages table with enhanced features
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reactions jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT sender_receiver_different CHECK (sender_id != receiver_id)
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
DO $$ 
BEGIN
    -- Group messages policies
    DROP POLICY IF EXISTS "Users can view messages in their groups" ON messages;
    DROP POLICY IF EXISTS "Users can insert messages in their groups" ON messages;
    DROP POLICY IF EXISTS "Users can update message reactions" ON messages;
    
    CREATE POLICY "Users can view messages in their groups"
        ON messages FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = messages.group_id
                AND group_members.user_id = auth.uid()
            )
        );
    
    CREATE POLICY "Users can insert messages in their groups"
        ON messages FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = messages.group_id
                AND group_members.user_id = auth.uid()
            )
        );
    
    CREATE POLICY "Users can update message reactions"
        ON messages FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = messages.group_id
                AND group_members.user_id = auth.uid()
            )
        );
    
    -- Direct messages policies
    DROP POLICY IF EXISTS "Users can view their direct messages" ON direct_messages;
    DROP POLICY IF EXISTS "Users can send direct messages" ON direct_messages;
    DROP POLICY IF EXISTS "Users can update direct message reactions" ON direct_messages;
    DROP POLICY IF EXISTS "Users can update read status" ON direct_messages;
    
    CREATE POLICY "Users can view their direct messages"
        ON direct_messages FOR SELECT
        USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    
    CREATE POLICY "Users can send direct messages"
        ON direct_messages FOR INSERT
        WITH CHECK (auth.uid() = sender_id);
    
    CREATE POLICY "Users can update direct message reactions"
        ON direct_messages FOR UPDATE
        USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
        
    CREATE POLICY "Users can update read status"
        ON direct_messages FOR UPDATE
        USING (auth.uid() = receiver_id);
END $$;

-- Create optimized indexes
DROP INDEX IF EXISTS messages_group_id_idx;
DROP INDEX IF EXISTS messages_user_id_idx;
DROP INDEX IF EXISTS messages_created_at_idx;
DROP INDEX IF EXISTS direct_messages_sender_id_idx;
DROP INDEX IF EXISTS direct_messages_receiver_id_idx;
DROP INDEX IF EXISTS direct_messages_created_at_idx;
DROP INDEX IF EXISTS direct_messages_is_read_idx;

-- Create indexes for group messages
CREATE INDEX IF NOT EXISTS messages_group_id_idx ON messages(group_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);

-- Create enhanced indexes for direct messages
CREATE INDEX IF NOT EXISTS direct_messages_sender_receiver_created_idx 
ON direct_messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS direct_messages_receiver_sender_created_idx 
ON direct_messages(receiver_id, sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS direct_messages_unread_idx 
ON direct_messages(receiver_id, is_read) 
WHERE is_read = false;

-- Create helper functions for direct messages
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
RETURNS TABLE (
    sender_id UUID,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dm.sender_id,
        COUNT(*)::BIGINT as unread_count
    FROM direct_messages dm
    WHERE dm.receiver_id = user_id
    AND dm.is_read = false
    GROUP BY dm.sender_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_receiver_id UUID,
    p_sender_id UUID
) RETURNS void AS $$
BEGIN
    UPDATE direct_messages
    SET is_read = true
    WHERE receiver_id = p_receiver_id
    AND sender_id = p_sender_id
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

------------------------------------------
------------------------------------------
-- Events System
------------------------------------------

-- First, add is_approved column to existing events table
ALTER TABLE IF EXISTS public.events
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false NOT NULL;

-- Add media_url column to events table
ALTER TABLE IF EXISTS public.events
ADD COLUMN IF NOT EXISTS media_url text;

-- Create events table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  location text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  is_public boolean DEFAULT false NOT NULL,
  max_participants integer,
  is_approved boolean DEFAULT false NOT NULL,
  media_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create event participants table
CREATE TABLE IF NOT EXISTS public.event_participants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status text CHECK (status IN ('going', 'maybe', 'not_going')) NOT NULL DEFAULT 'going',
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id)
);

-- Enable RLS for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Create admin check function first
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN (auth.jwt() ->> 'email') = 'cl883@snu.edu.in';
END;
$$ language plpgsql security definer;

-- Create policies for events
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view public events" ON events;
    DROP POLICY IF EXISTS "Group members can view group events" ON events;
    DROP POLICY IF EXISTS "Users can create events" ON events;
    DROP POLICY IF EXISTS "Event creators can update events" ON events;
    DROP POLICY IF EXISTS "Event creators can delete events" ON events;
    DROP POLICY IF EXISTS "Users can view approved public events" ON events;
    DROP POLICY IF EXISTS "Group members can view approved group events" ON events;
    DROP POLICY IF EXISTS "Admin can update events" ON events;
    DROP POLICY IF EXISTS "Admin can delete events" ON events;
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON events;
    DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON events;
    DROP POLICY IF EXISTS "Enable update access for users based on email" ON events;
    DROP POLICY IF EXISTS "Enable delete access for users based on email" ON events;
    
    -- Create simplified policies
    CREATE POLICY "Enable read access for authenticated users"
        ON events FOR SELECT
        TO authenticated
        USING (true);
    
    CREATE POLICY "Enable insert access for authenticated users"
        ON events FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = created_by);
    
    CREATE POLICY "Enable update access for users based on email"
        ON events FOR UPDATE
        TO authenticated
        USING (
            auth.uid() = created_by 
            OR auth.email() = 'cl883@snu.edu.in'
        );
    
    CREATE POLICY "Enable delete access for users based on email"
        ON events FOR DELETE
        TO authenticated
        USING (
            auth.uid() = created_by 
            OR auth.email() = 'cl883@snu.edu.in'
        );
END $$;

-- Update event participants policies
DO $$ 
BEGIN
    -- Drop ALL existing policies first
    DROP POLICY IF EXISTS "Users can view event participants" ON event_participants;
    DROP POLICY IF EXISTS "Users can join/leave events" ON event_participants;
    DROP POLICY IF EXISTS "Users can update their participation status" ON event_participants;
    DROP POLICY IF EXISTS "Users can join/leave approved events" ON event_participants;
    DROP POLICY IF EXISTS "Users can manage event participation" ON event_participants;
    DROP POLICY IF EXISTS "Enable read access for event participants" ON event_participants;
    DROP POLICY IF EXISTS "Enable insert access for event participants" ON event_participants;
    DROP POLICY IF EXISTS "Enable update access for event participants" ON event_participants;
    DROP POLICY IF EXISTS "Enable delete access for event participants" ON event_participants;
    
    -- Create simplified policies
    CREATE POLICY "Enable read access for event participants"
        ON event_participants FOR SELECT
        TO authenticated
        USING (true);
    
    CREATE POLICY "Enable insert access for event participants"
        ON event_participants FOR INSERT
        TO authenticated
        WITH CHECK (
            auth.uid() = user_id
            AND EXISTS (
                SELECT 1 FROM events
                WHERE id = event_participants.event_id
            )
        );
    
    CREATE POLICY "Enable update access for event participants"
        ON event_participants FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id);
    
    CREATE POLICY "Enable delete access for event participants"
        ON event_participants FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
END $$;


-- First, clean up any existing tables to start fresh
DROP TABLE IF EXISTS public.dating_profiles CASCADE;
DROP TABLE IF EXISTS public.dating_connections CASCADE;
DROP TABLE IF EXISTS public.direct_messages CASCADE;

-- Create direct_messages table first
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    message_type TEXT CHECK (message_type IN ('regular', 'dating')) DEFAULT 'regular',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at timestamp with time zone,
    reactions jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false NOT NULL,
    CONSTRAINT sender_recipient_different CHECK (sender_id != recipient_id)
);

-- Enable RLS for direct_messages
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for direct_messages
CREATE POLICY "Users can view their messages"
    ON public.direct_messages
    FOR SELECT
    TO authenticated
    USING (auth.uid() IN (sender_id, recipient_id));

CREATE POLICY "Users can send messages"
    ON public.direct_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update messages"
    ON public.direct_messages
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = recipient_id);

-- Create dating_profiles table with essential fields
CREATE TABLE IF NOT EXISTS public.dating_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    gender text CHECK (gender IN ('male', 'female')) NOT NULL,
    looking_for text CHECK (looking_for IN ('male', 'female')) NOT NULL,
    bio text,
    interests text[] DEFAULT array[]::text[],
    answers JSONB DEFAULT '{}'::jsonb,
    has_completed_profile BOOLEAN DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create dating_connections table for matches
CREATE TABLE IF NOT EXISTS public.dating_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(from_user_id, to_user_id)
);

-- Add type column to existing direct_messages table for dating messages
ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT CHECK (message_type IN ('regular', 'dating')) DEFAULT 'regular';

-- Enable Row Level Security
ALTER TABLE public.dating_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dating_connections ENABLE ROW LEVEL SECURITY;

-- Policies for dating_profiles
CREATE POLICY "Users can view their own dating profile"
    ON public.dating_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dating profile"
    ON public.dating_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dating profile"
    ON public.dating_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Policies for dating_connections
CREATE POLICY "Users can view their connections"
    ON public.dating_connections
    FOR SELECT
    TO authenticated
    USING (auth.uid() IN (from_user_id, to_user_id));

CREATE POLICY "Users can create connections"
    ON public.dating_connections
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update their received connections"
    ON public.dating_connections
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = to_user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS dating_profiles_user_id_idx ON public.dating_profiles(user_id);
CREATE INDEX IF NOT EXISTS dating_profiles_gender_idx ON public.dating_profiles(gender);
CREATE INDEX IF NOT EXISTS dating_profiles_looking_for_idx ON public.dating_profiles(looking_for);
CREATE INDEX IF NOT EXISTS dating_profiles_completed_idx ON public.dating_profiles(has_completed_profile);
CREATE INDEX IF NOT EXISTS dating_connections_from_user_idx ON public.dating_connections(from_user_id);
CREATE INDEX IF NOT EXISTS dating_connections_to_user_idx ON public.dating_connections(to_user_id);
CREATE INDEX IF NOT EXISTS dating_connections_status_idx ON public.dating_connections(status);
CREATE INDEX IF NOT EXISTS direct_messages_type_idx ON public.direct_messages(message_type);

-- Helper function to get potential matches
CREATE OR REPLACE FUNCTION get_potential_matches(user_uuid UUID)
RETURNS TABLE (
    profile_id UUID,
    user_id UUID,
    gender TEXT,
    bio TEXT,
    interests TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dp.id as profile_id,
        dp.user_id,
        dp.gender,
        dp.bio,
        dp.interests
    FROM dating_profiles dp
    WHERE dp.user_id != user_uuid
    AND dp.has_completed_profile = true
    AND dp.gender = (
        SELECT looking_for 
        FROM dating_profiles 
        WHERE user_id = user_uuid
    )
    AND NOT EXISTS (
        SELECT 1 
        FROM dating_connections dc 
        WHERE (dc.from_user_id = user_uuid AND dc.to_user_id = dp.user_id)
        OR (dc.to_user_id = user_uuid AND dc.from_user_id = dp.user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if users are matched
CREATE OR REPLACE FUNCTION are_users_matched(user1_uuid UUID, user2_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM dating_connections 
        WHERE status = 'accepted'
        AND (
            (from_user_id = user1_uuid AND to_user_id = user2_uuid)
            OR 
            (from_user_id = user2_uuid AND to_user_id = user1_uuid)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


------------------------------------------
-- Confessions System
------------------------------------------

-- Create a function to ensure profile exists before creating a confession
CREATE OR REPLACE FUNCTION ensure_profile_exists_for_confession()
RETURNS trigger AS $$
BEGIN
    -- Check if profile exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id) THEN
        -- Get user info from auth.users
        DECLARE
            user_data RECORD;
        BEGIN
            SELECT email, raw_user_meta_data->>'name' as name
            INTO user_data
            FROM auth.users
            WHERE id = NEW.user_id;

            IF user_data IS NULL THEN
                RAISE EXCEPTION 'User not found in auth.users';
            END IF;

            -- Generate username
            DECLARE
                username_base text := generate_base_username(COALESCE(user_data.email, ''));
                final_username text := generate_unique_username(username_base);
            BEGIN
                -- Insert the profile
                INSERT INTO public.profiles (
                    id,
                    email,
                    name,
                    username,
                    batch,
                    branch,
                    interests,
                    updated_at
                )
                VALUES (
                    NEW.user_id,
                    COALESCE(user_data.email, ''),
                    COALESCE(user_data.name, split_part(COALESCE(user_data.email, ''), '@', 1)),
                    final_username,
                    '2022',  -- Default batch
                    'CSE',   -- Default branch
                    array[]::text[],
                    now()
                );
            EXCEPTION
                WHEN others THEN
                    RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
            END;
        EXCEPTION
            WHEN others THEN
                RAISE EXCEPTION 'Failed to get user data: %', SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate confessions table with proper constraints
DROP TABLE IF EXISTS public.confession_likes CASCADE;
DROP TABLE IF EXISTS public.confession_comments CASCADE;
DROP TABLE IF EXISTS public.confessions CASCADE;

CREATE TABLE IF NOT EXISTS public.confessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content text NOT NULL,
    anonymous_name text DEFAULT 'Anonymous',
    media_url text,
    media_type text CHECK (media_type IN ('image', 'video', null)),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.confession_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    confession_id uuid REFERENCES public.confessions(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    anonymous_name text DEFAULT 'Anonymous',
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.confession_likes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    confession_id uuid REFERENCES public.confessions(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(confession_id, user_id)
);

-- Create trigger for confessions
DROP TRIGGER IF EXISTS ensure_profile_before_confession ON public.confessions;
CREATE TRIGGER ensure_profile_before_confession
    BEFORE INSERT ON public.confessions
    FOR EACH ROW
    EXECUTE FUNCTION ensure_profile_exists_for_confession();

-- Enable RLS
ALTER TABLE public.confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confession_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confession_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for confessions
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view confessions" ON confessions;
    DROP POLICY IF EXISTS "Authenticated users can create confessions" ON confessions;
    DROP POLICY IF EXISTS "Users can delete their own confessions" ON confessions;
    
    -- Create new policies
    CREATE POLICY "Anyone can view confessions"
        ON confessions FOR SELECT
        TO authenticated
        USING (true);
    
    CREATE POLICY "Authenticated users can create confessions"
        ON confessions FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR user_id IS NULL));
    
    CREATE POLICY "Users can delete their own confessions"
        ON confessions FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);

    -- Confession comments policies
    DROP POLICY IF EXISTS "Anyone can view confession comments" ON confession_comments;
    DROP POLICY IF EXISTS "Authenticated users can create confession comments" ON confession_comments;
    
    CREATE POLICY "Anyone can view confession comments"
        ON confession_comments FOR SELECT
        TO authenticated
        USING (true);
    
    CREATE POLICY "Authenticated users can create confession comments"
        ON confession_comments FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR user_id IS NULL));

    -- Confession likes policies
    DROP POLICY IF EXISTS "Anyone can view confession likes" ON confession_likes;
    DROP POLICY IF EXISTS "Authenticated users can manage confession likes" ON confession_likes;
    
    CREATE POLICY "Anyone can view confession likes"
        ON confession_likes FOR SELECT
        TO authenticated
        USING (true);
    
    CREATE POLICY "Authenticated users can manage confession likes"
        ON confession_likes FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS confessions_user_id_idx ON confessions(user_id);
CREATE INDEX IF NOT EXISTS confession_comments_confession_id_idx ON confession_comments(confession_id);
CREATE INDEX IF NOT EXISTS confession_likes_confession_id_user_id_idx ON confession_likes(confession_id, user_id);

------------------------------------------
-- Memes System
------------------------------------------

-- Create memes tables
CREATE TABLE IF NOT EXISTS public.memes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.meme_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meme_id uuid REFERENCES public.memes(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.meme_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meme_id uuid REFERENCES public.memes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(meme_id, user_id)
);

-- Enable RLS for memes
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meme_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meme_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for memes
DO $$ 
BEGIN
    -- Memes policies
    DROP POLICY IF EXISTS "Anyone can view memes" ON memes;
    DROP POLICY IF EXISTS "Authenticated users can create memes" ON memes;
    DROP POLICY IF EXISTS "Users can delete their own memes" ON memes;
    
    CREATE POLICY "Anyone can view memes"
        ON memes FOR SELECT
        USING (true);
    
    CREATE POLICY "Authenticated users can create memes"
        ON memes FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Users can delete their own memes"
        ON memes FOR DELETE
        USING (auth.uid() = user_id);

    -- Meme comments policies
    DROP POLICY IF EXISTS "Anyone can view meme comments" ON meme_comments;
    DROP POLICY IF EXISTS "Authenticated users can create meme comments" ON meme_comments;
    
    CREATE POLICY "Anyone can view meme comments"
        ON meme_comments FOR SELECT
        USING (true);
    
    CREATE POLICY "Authenticated users can create meme comments"
        ON meme_comments FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');

    -- Meme likes policies
    DROP POLICY IF EXISTS "Anyone can view meme likes" ON meme_likes;
    DROP POLICY IF EXISTS "Authenticated users can manage meme likes" ON meme_likes;
    
    CREATE POLICY "Anyone can view meme likes"
        ON meme_likes FOR SELECT
        USING (true);
    
    CREATE POLICY "Authenticated users can manage meme likes"
        ON meme_likes FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
END $$;

------------------------------------------
-- Support System
------------------------------------------

-- Create support tables
CREATE TABLE IF NOT EXISTS public.support_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  is_anonymous boolean DEFAULT false NOT NULL,
  is_resolved boolean DEFAULT false NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.support_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  post_id uuid REFERENCES public.support_posts(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_anonymous boolean DEFAULT false NOT NULL,
  is_accepted boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for support
ALTER TABLE public.support_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for support
DO $$ 
BEGIN
    -- Support posts policies
    DROP POLICY IF EXISTS "Anyone can view support posts" ON support_posts;
    DROP POLICY IF EXISTS "Authenticated users can create support posts" ON support_posts;
    DROP POLICY IF EXISTS "Users can update their own support posts" ON support_posts;
    
    CREATE POLICY "Anyone can view support posts"
        ON support_posts FOR SELECT
        USING (true);
    
    CREATE POLICY "Authenticated users can create support posts"
        ON support_posts FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Users can update their own support posts"
        ON support_posts FOR UPDATE
        USING (auth.uid() = created_by);

    -- Support responses policies
    DROP POLICY IF EXISTS "Anyone can view support responses" ON support_responses;
    DROP POLICY IF EXISTS "Authenticated users can create support responses" ON support_responses;
    DROP POLICY IF EXISTS "Users can update their own responses" ON support_responses;
    
    CREATE POLICY "Anyone can view support responses"
        ON support_responses FOR SELECT
        USING (true);
    
    CREATE POLICY "Authenticated users can create support responses"
        ON support_responses FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Users can update their own responses"
        ON support_responses FOR UPDATE
        USING (auth.uid() = created_by);
END $$;

------------------------------------------
-- Notifications System
------------------------------------------

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  data jsonb NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
    DROP POLICY IF EXISTS "System can create notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update their notification status" ON notifications;
    
    CREATE POLICY "Users can view their own notifications"
        ON notifications FOR SELECT
        USING (auth.uid() = user_id);
    
    CREATE POLICY "System can create notifications"
        ON notifications FOR INSERT
        WITH CHECK (true);
    
    CREATE POLICY "Users can update their notification status"
        ON notifications FOR UPDATE
        USING (auth.uid() = user_id);
END $$;

------------------------------------------
-- Storage Buckets
------------------------------------------

-- Create and configure storage buckets
------------------------------------------
-- Storage Buckets
------------------------------------------

-- Create and configure storage buckets
DO $$
BEGIN
    -- Create memes bucket
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('memes', 'memes', true)
    ON CONFLICT (id) DO NOTHING;

    -- Create confessions bucket
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('confessions', 'confessions', true)
    ON CONFLICT (id) DO NOTHING;

    -- Storage policies for memes bucket
    DROP POLICY IF EXISTS "Anyone can view meme images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload meme images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own meme images" ON storage.objects;

    CREATE POLICY "Anyone can view meme images"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'memes');

    CREATE POLICY "Authenticated users can upload meme images"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'memes' 
            AND auth.role() = 'authenticated'
        );

    CREATE POLICY "Users can delete their own meme images"
        ON storage.objects FOR DELETE
        USING (
            bucket_id = 'memes'
            AND owner::text = auth.uid()::text
        );

    -- Storage policies for confessions bucket
    DROP POLICY IF EXISTS "Anyone can view confession media" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload confession media" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own confession media" ON storage.objects;

    CREATE POLICY "Anyone can view confession media"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'confessions');

    CREATE POLICY "Authenticated users can upload confession media"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'confessions' 
            AND auth.role() = 'authenticated'
        );

    CREATE POLICY "Users can delete their own confession media"
        ON storage.objects FOR DELETE
        USING (
            bucket_id = 'confessions'
            AND owner::text = auth.uid()::text
        );
END $$;

------------------------------------------
-- Performance Indexes
------------------------------------------

-- Create indexes for better performance

CREATE INDEX IF NOT EXISTS events_created_by_idx ON events(created_by);
CREATE INDEX IF NOT EXISTS events_group_id_idx ON events(group_id);
CREATE INDEX IF NOT EXISTS events_start_time_idx ON events(start_time);
CREATE INDEX IF NOT EXISTS event_participants_event_id_idx ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS event_participants_user_id_idx ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS dating_profiles_user_id_idx ON dating_profiles(user_id);
CREATE INDEX IF NOT EXISTS dating_matches_sender_id_idx ON dating_matches(sender_id);
CREATE INDEX IF NOT EXISTS dating_matches_receiver_id_idx ON dating_matches(receiver_id);
CREATE INDEX IF NOT EXISTS confessions_user_id_idx ON confessions(user_id);
CREATE INDEX IF NOT EXISTS confession_comments_confession_id_idx ON confession_comments(confession_id);
CREATE INDEX IF NOT EXISTS confession_likes_confession_id_idx ON confession_likes(confession_id);
CREATE INDEX IF NOT EXISTS memes_user_id_idx ON memes(user_id);
CREATE INDEX IF NOT EXISTS memes_media_type_idx ON memes(media_type);
CREATE INDEX IF NOT EXISTS meme_comments_meme_id_idx ON meme_comments(meme_id);
CREATE INDEX IF NOT EXISTS meme_comments_user_id_idx ON meme_comments(user_id);
CREATE INDEX IF NOT EXISTS meme_likes_meme_id_idx ON meme_likes(meme_id);
CREATE INDEX IF NOT EXISTS meme_likes_user_id_idx ON meme_likes(user_id);
CREATE INDEX IF NOT EXISTS support_posts_created_by_idx ON support_posts(created_by);
CREATE INDEX IF NOT EXISTS support_responses_post_id_idx ON support_responses(post_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_created_at_idx ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS dating_matches_compatibility_score_idx ON dating_matches(compatibility_score DESC);
CREATE INDEX IF NOT EXISTS direct_messages_is_read_idx ON direct_messages(is_read);

-- Create a function to ensure profile exists
CREATE OR REPLACE FUNCTION ensure_profile_exists()
RETURNS trigger AS $$
DECLARE
    username_base text;
    final_username text;
    user_name text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
        -- Get user info
        SELECT 
            email,
            COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
        INTO 
            username_base,
            user_name
        FROM auth.users
        WHERE id = auth.uid();

        -- Generate username
        final_username := generate_unique_username(generate_base_username(username_base));

        INSERT INTO public.profiles (
            id,
            email,
            name,
            username,
            batch,
            branch,
            interests,
            updated_at
        )
        VALUES (
            auth.uid(),
            username_base,
            user_name,
            final_username,
            '2022',  -- Default batch
            'CSE',   -- Default branch
            array[]::text[],
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to ensure profile exists before event creation
DROP TRIGGER IF EXISTS ensure_profile_before_event ON public.events;
CREATE TRIGGER ensure_profile_before_event
    BEFORE INSERT ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION ensure_profile_exists();

-- Create a function to ensure profile exists before creating a dating profile
CREATE OR REPLACE FUNCTION ensure_profile_exists_for_dating()
RETURNS trigger AS $$
BEGIN
    -- Check if profile exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id) THEN
        -- Get user info from auth.users
        DECLARE
            user_data RECORD;
        BEGIN
            SELECT email, raw_user_meta_data->>'name' as name
            INTO user_data
            FROM auth.users
            WHERE id = NEW.user_id;

            IF user_data IS NULL THEN
                RAISE EXCEPTION 'User not found in auth.users';
            END IF;

            -- Generate username
            DECLARE
                username_base text := generate_base_username(COALESCE(user_data.email, ''));
                final_username text := generate_unique_username(username_base);
            BEGIN
                -- Insert the profile
                INSERT INTO public.profiles (
                    id,
                    email,
                    name,
                    username,
                    batch,
                    branch,
                    interests,
                    updated_at
                )
                VALUES (
                    NEW.user_id,
                    COALESCE(user_data.email, ''),
                    COALESCE(user_data.name, split_part(COALESCE(user_data.email, ''), '@', 1)),
                    final_username,
                    '2022',  -- Default batch
                    'CSE',   -- Default branch
                    array[]::text[],
                    now()
                );
            EXCEPTION
                WHEN others THEN
                    RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
            END;
        EXCEPTION
            WHEN others THEN
                RAISE EXCEPTION 'Failed to get user data: %', SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for dating_profiles
DROP TRIGGER IF EXISTS ensure_profile_before_dating ON public.dating_profiles;
CREATE TRIGGER ensure_profile_before_dating
    BEFORE INSERT ON public.dating_profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_profile_exists_for_dating();

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Remove email_otps table and related objects
DROP TABLE IF EXISTS public.email_otps CASCADE;
DROP FUNCTION IF EXISTS clean_expired_otps CASCADE;

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;


