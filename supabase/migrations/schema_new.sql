-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

------------------------------------------
-- Base Tables
------------------------------------------

-- Create profiles table (core user data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  batch text NOT NULL,
  branch text NOT NULL,
  interests text[] DEFAULT array[]::text[],
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
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

------------------------------------------
-- Groups System
------------------------------------------

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    code text UNIQUE NOT NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create group members table
CREATE TABLE IF NOT EXISTS public.group_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role text CHECK (role IN ('admin', 'member')) NOT NULL DEFAULT 'member',
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, user_id)
);

-- Create group messages table
CREATE TABLE IF NOT EXISTS public.group_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for all tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

------------------------------------------
-- Messaging System
------------------------------------------

-- Create messages table for group messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  reactions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create direct messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  reactions jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
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
    
    CREATE POLICY "Users can view their direct messages"
        ON direct_messages FOR SELECT
        USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    
    CREATE POLICY "Users can send direct messages"
        ON direct_messages FOR INSERT
        WITH CHECK (auth.uid() = sender_id);
    
    CREATE POLICY "Users can update direct message reactions"
        ON direct_messages FOR UPDATE
        USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
END $$;

------------------------------------------
-- Performance Indexes
------------------------------------------

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS groups_created_by_idx ON groups(created_by);
CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON group_members(user_id);
CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON group_members(group_id);
CREATE INDEX IF NOT EXISTS groups_code_idx ON groups(code);
CREATE INDEX IF NOT EXISTS messages_group_id_idx ON messages(group_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_sender_id_idx ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS direct_messages_receiver_id_idx ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS direct_messages_created_at_idx ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_is_read_idx ON direct_messages(is_read); 