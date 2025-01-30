-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop all tables in correct order
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.support_responses;
DROP TABLE IF EXISTS public.support_posts;
DROP TABLE IF EXISTS public.meme_likes;
DROP TABLE IF EXISTS public.meme_comments;
DROP TABLE IF EXISTS public.memes;
DROP TABLE IF EXISTS public.confession_likes;
DROP TABLE IF EXISTS public.confession_comments;
DROP TABLE IF EXISTS public.confessions;
DROP TABLE IF EXISTS public.dating_matches;
DROP TABLE IF EXISTS public.dating_profiles;
DROP TABLE IF EXISTS public.event_participants;
DROP TABLE IF EXISTS public.events;
DROP TABLE IF EXISTS public.direct_messages;
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.group_members;
DROP TABLE IF EXISTS public.groups;
DROP TABLE IF EXISTS public.profiles;

-- Create base tables first
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  batch text NOT NULL,
  branch text NOT NULL,
  interests text[] DEFAULT array[]::text[],
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and create policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    
    CREATE POLICY "Users can view all profiles"
        ON profiles FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can update own profile"
        ON profiles FOR UPDATE
        USING (auth.uid() = id);
END $$;

-- Now create the groups system tables
CREATE TABLE IF NOT EXISTS public.groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    code text UNIQUE NOT NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    is_private boolean DEFAULT false NOT NULL,
    max_members integer,
    category text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.group_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role text CHECK (role IN ('admin', 'moderator', 'member')) NOT NULL DEFAULT 'member',
    status text CHECK (status IN ('active', 'banned', 'left')) NOT NULL DEFAULT 'active',
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, user_id)
);

-- Create unified messaging tables
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content text NOT NULL,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type text CHECK (type IN ('text', 'image', 'file')) NOT NULL DEFAULT 'text',
    metadata jsonb DEFAULT '{}'::jsonb,
    reactions jsonb DEFAULT '{}'::jsonb,
    is_edited boolean DEFAULT false NOT NULL,
    edited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content text NOT NULL,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type text CHECK (type IN ('text', 'image', 'file')) NOT NULL DEFAULT 'text',
    metadata jsonb DEFAULT '{}'::jsonb,
    reactions jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for all tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for groups system
DO $$ 
BEGIN
    -- Groups policies
    DROP POLICY IF EXISTS "Enable read access for all users" ON groups;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON groups;
    DROP POLICY IF EXISTS "Enable update for group creators" ON groups;
    DROP POLICY IF EXISTS "Enable delete for group creators" ON groups;
    
    CREATE POLICY "Enable read access for all users"
        ON groups FOR SELECT
        USING (true);
    
    CREATE POLICY "Enable insert for authenticated users"
        ON groups FOR INSERT
        WITH CHECK (auth.uid() = created_by);
    
    CREATE POLICY "Enable update for group creators"
        ON groups FOR UPDATE
        USING (auth.uid() = created_by);
    
    CREATE POLICY "Enable delete for group creators"
        ON groups FOR DELETE
        USING (auth.uid() = created_by);
    
    -- Group members policies
    DROP POLICY IF EXISTS "Enable read access for all users" ON group_members;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON group_members;
    DROP POLICY IF EXISTS "Enable update for group admins" ON group_members;
    DROP POLICY IF EXISTS "Enable delete own membership" ON group_members;
    
    CREATE POLICY "Enable read access for all users"
        ON group_members FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM groups
                WHERE groups.id = group_members.group_id
                AND (
                    groups.is_private = false OR
                    auth.uid() = groups.created_by OR
                    auth.uid() = group_members.user_id
                )
            )
        );
    
    CREATE POLICY "Enable insert for authenticated users"
        ON group_members FOR INSERT
        WITH CHECK (
            auth.uid() = user_id AND
            NOT EXISTS (
                SELECT 1 FROM groups g
                LEFT JOIN group_members gm ON g.id = gm.group_id
                WHERE g.id = group_members.group_id
                AND g.max_members IS NOT NULL
                GROUP BY g.id, g.max_members
                HAVING COUNT(gm.id) >= g.max_members
            )
        );
    
    CREATE POLICY "Enable update for group admins"
        ON group_members FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM groups
                WHERE groups.id = group_members.group_id
                AND (
                    auth.uid() = groups.created_by OR
                    (
                        auth.uid() = group_members.user_id AND
                        group_members.role IN ('admin', 'moderator')
                    )
                )
            )
        );
    
    CREATE POLICY "Enable delete own membership"
        ON group_members FOR DELETE
        USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM groups
                WHERE groups.id = group_members.group_id
                AND auth.uid() = groups.created_by
            )
        );
        
    -- Messages policies
    DROP POLICY IF EXISTS "Enable read access for group members" ON messages;
    DROP POLICY IF EXISTS "Enable insert for group members" ON messages;
    DROP POLICY IF EXISTS "Enable update for message creators" ON messages;
    DROP POLICY IF EXISTS "Enable delete for message creators" ON messages;
    
    CREATE POLICY "Enable read access for group members"
        ON messages FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = messages.group_id
                AND group_members.user_id = auth.uid()
                AND group_members.status = 'active'
            )
        );
    
    CREATE POLICY "Enable insert for group members"
        ON messages FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = messages.group_id
                AND group_members.user_id = auth.uid()
                AND group_members.status = 'active'
            )
        );
    
    CREATE POLICY "Enable update for message creators"
        ON messages FOR UPDATE
        USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM groups
                WHERE groups.id = messages.group_id
                AND auth.uid() = groups.created_by
            )
        );
    
    CREATE POLICY "Enable delete for message creators"
        ON messages FOR DELETE
        USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM groups
                WHERE groups.id = messages.group_id
                AND auth.uid() = groups.created_by
            )
        );

    -- Direct messages policies
    DROP POLICY IF EXISTS "Enable read access for participants" ON direct_messages;
    DROP POLICY IF EXISTS "Enable insert for sender" ON direct_messages;
    DROP POLICY IF EXISTS "Enable update for participants" ON direct_messages;
    
    CREATE POLICY "Enable read access for participants"
        ON direct_messages FOR SELECT
        USING (auth.uid() IN (sender_id, receiver_id));
    
    CREATE POLICY "Enable insert for sender"
        ON direct_messages FOR INSERT
        WITH CHECK (auth.uid() = sender_id);
    
    CREATE POLICY "Enable update for participants"
        ON direct_messages FOR UPDATE
        USING (auth.uid() IN (sender_id, receiver_id));
END $$;

-- Create indexes for better performance
DROP INDEX IF EXISTS groups_created_by_idx;
DROP INDEX IF EXISTS groups_created_at_idx;
DROP INDEX IF EXISTS groups_category_idx;
DROP INDEX IF EXISTS group_members_user_id_idx;
DROP INDEX IF EXISTS group_members_group_id_idx;
DROP INDEX IF EXISTS group_members_role_idx;
DROP INDEX IF EXISTS group_members_status_idx;
DROP INDEX IF EXISTS messages_group_id_idx;
DROP INDEX IF EXISTS messages_user_id_idx;
DROP INDEX IF EXISTS messages_created_at_idx;
DROP INDEX IF EXISTS messages_type_idx;
DROP INDEX IF EXISTS direct_messages_sender_id_idx;
DROP INDEX IF EXISTS direct_messages_receiver_id_idx;
DROP INDEX IF EXISTS direct_messages_created_at_idx;
DROP INDEX IF EXISTS direct_messages_is_read_idx;

CREATE INDEX IF NOT EXISTS groups_created_by_idx ON groups(created_by);
CREATE INDEX IF NOT EXISTS groups_created_at_idx ON groups(created_at DESC);
CREATE INDEX IF NOT EXISTS groups_category_idx ON groups(category);
CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON group_members(user_id);
CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON group_members(group_id);
CREATE INDEX IF NOT EXISTS group_members_role_idx ON group_members(role);
CREATE INDEX IF NOT EXISTS group_members_status_idx ON group_members(status);
CREATE INDEX IF NOT EXISTS messages_group_id_idx ON messages(group_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS messages_type_idx ON messages(type);
CREATE INDEX IF NOT EXISTS direct_messages_sender_id_idx ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS direct_messages_receiver_id_idx ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS direct_messages_created_at_idx ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_is_read_idx ON direct_messages(is_read); 