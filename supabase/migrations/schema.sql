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

-- Create policies for all tables
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
    DROP POLICY IF EXISTS "Enable delete own membership" ON group_members;
    
    CREATE POLICY "Enable read access for all users"
        ON group_members FOR SELECT
        USING (true);
    
    CREATE POLICY "Enable insert for authenticated users"
        ON group_members FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Enable delete own membership"
        ON group_members FOR DELETE
        USING (auth.uid() = user_id);
        
    -- Group messages policies
    DROP POLICY IF EXISTS "Enable read access for group members" ON group_messages;
    DROP POLICY IF EXISTS "Enable insert for group members" ON group_messages;
    DROP POLICY IF EXISTS "Enable delete for message creators" ON group_messages;
    
    CREATE POLICY "Enable read access for group members"
        ON group_messages FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = group_messages.group_id
                AND group_members.user_id = auth.uid()
            )
        );
    
    CREATE POLICY "Enable insert for group members"
        ON group_messages FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = group_messages.group_id
                AND group_members.user_id = auth.uid()
            )
        );
    
    CREATE POLICY "Enable delete for message creators"
        ON group_messages FOR DELETE
        USING (auth.uid() = user_id);
END $$;

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
-- Events System
------------------------------------------

-- First, add is_approved column to existing events table
ALTER TABLE IF EXISTS public.events
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false NOT NULL;

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
    RETURN (auth.jwt() ->> 'email') = 'an459@snu.edu.in';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    
    -- Create new policies with approval system
    CREATE POLICY "Users can view approved public events"
        ON events FOR SELECT
        USING (
            (is_public = true AND is_approved = true)
            OR
            (auth.jwt() ->> 'email' = 'an459@snu.edu.in')
        );
    
    CREATE POLICY "Group members can view approved group events"
        ON events FOR SELECT
        USING (
            (EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = events.group_id
                AND group_members.user_id = auth.uid()
            ) AND is_approved = true)
            OR
            (auth.jwt() ->> 'email' = 'an459@snu.edu.in')
        );
    
    CREATE POLICY "Users can create events"
        ON events FOR INSERT
        WITH CHECK (
            (is_public = true AND auth.uid() IS NOT NULL)
            OR
            (group_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = events.group_id
                AND group_members.user_id = auth.uid()
            ))
        );
    
    CREATE POLICY "Admins can view all events"
        ON public.events
        FOR SELECT
        USING (
            auth.role() = 'authenticated' AND (
                auth.uid() = created_by
                OR (auth.jwt() ->> 'email' = 'an459@snu.edu.in')
                OR is_public = true
            )
        );
    
    CREATE POLICY "Admins can update any event"
        ON public.events
        FOR UPDATE
        USING (
            auth.uid() = created_by
            OR (auth.jwt() ->> 'email' = 'an459@snu.edu.in')
        );
    
    CREATE POLICY "Admins can delete any event"
        ON public.events
        FOR DELETE
        USING (
            auth.jwt() ->> 'email' = 'an459@snu.edu.in'
        );
END $$;

-- Update event participants policies
DO $$ 
BEGIN
    -- First, drop ALL existing policies for event_participants
    DROP POLICY IF EXISTS "Users can view event participants" ON event_participants;
    DROP POLICY IF EXISTS "Users can join/leave events" ON event_participants;
    DROP POLICY IF EXISTS "Users can update their participation status" ON event_participants;
    DROP POLICY IF EXISTS "Users can join/leave approved events" ON event_participants;
    
    -- Then create the new policies
    CREATE POLICY "Users can view event participants"
        ON event_participants FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM events
                WHERE events.id = event_participants.event_id
                AND (
                    (events.is_public = true AND events.is_approved = true)
                    OR
                    (EXISTS (
                        SELECT 1 FROM group_members
                        WHERE group_members.group_id = events.group_id
                        AND group_members.user_id = auth.uid()
                    ) AND events.is_approved = true)
                    OR
                    (auth.jwt() ->> 'email' = 'an459@snu.edu.in')
                )
            )
        );
    
    CREATE POLICY "Users can join/leave events"
        ON event_participants FOR INSERT
        WITH CHECK (
            auth.uid() = user_id
            AND
            EXISTS (
                SELECT 1 FROM events
                WHERE events.id = event_participants.event_id
                AND events.is_approved = true
                AND (
                    events.is_public = true
                    OR
                    EXISTS (
                        SELECT 1 FROM group_members
                        WHERE group_members.group_id = events.group_id
                        AND group_members.user_id = auth.uid()
                    )
                )
            )
        );
    
    CREATE POLICY "Users can update their participation status"
        ON event_participants FOR UPDATE
        USING (auth.uid() = user_id);
    
    CREATE POLICY "Admins can manage participants"
        ON public.event_participants
        FOR ALL
        USING (
            auth.jwt() ->> 'email' = 'an459@snu.edu.in'
        );
END $$;

-- Add index for is_approved column
CREATE INDEX IF NOT EXISTS events_is_approved_idx ON events(is_approved);

------------------------------------------
-- Dating System
------------------------------------------

-- Create dating profiles table
CREATE TABLE IF NOT EXISTS public.dating_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bio text,
  interests text[] DEFAULT array[]::text[],
  age integer,
  location text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for dating profiles
ALTER TABLE public.dating_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for dating profiles
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view dating profiles" ON dating_profiles;
    DROP POLICY IF EXISTS "Users can create dating profiles" ON dating_profiles;
    DROP POLICY IF EXISTS "Users can update dating profiles" ON dating_profiles;
    DROP POLICY IF EXISTS "Users can delete dating profiles" ON dating_profiles;
    
    -- Create new policies
    CREATE POLICY "Users can view dating profiles"
        ON dating_profiles FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can create dating profiles"
        ON dating_profiles FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update dating profiles"
        ON dating_profiles FOR UPDATE
        USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete dating profiles"
        ON dating_profiles FOR DELETE
        USING (auth.uid() = user_id);
END $$;

-- Create dating matches table
CREATE TABLE IF NOT EXISTS public.dating_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES public.dating_profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.dating_profiles(id) ON DELETE CASCADE NOT NULL,
  compatibility_score integer NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for dating matches
ALTER TABLE public.dating_matches ENABLE ROW LEVEL SECURITY;

-- Create policies for dating matches
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view dating matches" ON dating_matches;
    DROP POLICY IF EXISTS "Users can create dating matches" ON dating_matches;
    DROP POLICY IF EXISTS "Users can delete dating matches" ON dating_matches;
    
    -- Create new policies
    CREATE POLICY "Users can view dating matches"
        ON dating_matches FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can create dating matches"
        ON dating_matches FOR INSERT
        WITH CHECK (auth.uid() = sender_id);
    
    CREATE POLICY "Users can delete dating matches"
        ON dating_matches FOR DELETE
        USING (auth.uid() = sender_id);
END $$;

------------------------------------------
-- Confessions System
------------------------------------------

-- Create confessions table
CREATE TABLE IF NOT EXISTS public.confessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for confessions
ALTER TABLE public.confessions ENABLE ROW LEVEL SECURITY;

-- Create policies for confessions
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view confessions" ON confessions;
    DROP POLICY IF EXISTS "Users can create confessions" ON confessions;
    DROP POLICY IF EXISTS "Users can delete confessions" ON confessions;
    
    -- Create new policies
    CREATE POLICY "Users can view confessions"
        ON confessions FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can create confessions"
        ON confessions FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete confessions"
        ON confessions FOR DELETE
        USING (auth.uid() = user_id);
END $$;

-- Create confession comments table
CREATE TABLE IF NOT EXISTS public.confession_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  confession_id uuid REFERENCES public.confessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for confession comments
ALTER TABLE public.confession_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for confession comments
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view confession comments" ON confession_comments;
    DROP POLICY IF EXISTS "Users can create confession comments" ON confession_comments;
    DROP POLICY IF EXISTS "Users can delete confession comments" ON confession_comments;
    
    -- Create new policies
    CREATE POLICY "Users can view confession comments"
        ON confession_comments FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can create confession comments"
        ON confession_comments FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete confession comments"
        ON confession_comments FOR DELETE
        USING (auth.uid() = user_id);
END $$;

-- Create confession likes table
CREATE TABLE IF NOT EXISTS public.confession_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  confession_id uuid REFERENCES public.confessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for confession likes
ALTER TABLE public.confession_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for confession likes
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can like confession" ON confession_likes;
    DROP POLICY IF EXISTS "Users can delete confession like" ON confession_likes;
    
    -- Create new policies
    CREATE POLICY "Users can like confession"
        ON confession_likes FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete confession like"
        ON confession_likes FOR DELETE
        USING (auth.uid() = user_id);
END $$;

------------------------------------------
-- Memes System
------------------------------------------

-- Create memes table
CREATE TABLE IF NOT EXISTS public.memes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for memes
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;

-- Create policies for memes
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view memes" ON memes;
    DROP POLICY IF EXISTS "Users can create memes" ON memes;
    DROP POLICY IF EXISTS "Users can delete memes" ON memes;
    
    -- Create new policies
    CREATE POLICY "Users can view memes"
        ON memes FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can create memes"
        ON memes FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete memes"
        ON memes FOR DELETE
        USING (auth.uid() = user_id);
END $$;

-- Create meme comments table
CREATE TABLE IF NOT EXISTS public.meme_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meme_id uuid REFERENCES public.memes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for meme comments
ALTER TABLE public.meme_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for meme comments
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view meme comments" ON meme_comments;
    DROP POLICY IF EXISTS "Users can create meme comments" ON meme_comments;
    DROP POLICY IF EXISTS "Users can delete meme comments" ON meme_comments;
    
    -- Create new policies
    CREATE POLICY "Users can view meme comments"
        ON meme_comments FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can create meme comments"
        ON meme_comments FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete meme comments"
        ON meme_comments FOR DELETE
        USING (auth.uid() = user_id);
END $$;

-- Create meme likes table
CREATE TABLE IF NOT EXISTS public.meme_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meme_id uuid REFERENCES public.memes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for meme likes
ALTER TABLE public.meme_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for meme likes
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can like meme" ON meme_likes;
    DROP POLICY IF EXISTS "Users can delete meme like" ON meme_likes;
    
    -- Create new policies
    CREATE POLICY "Users can like meme"
        ON meme_likes FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete meme like"
        ON meme_likes FOR DELETE
        USING (auth.uid() = user_id);
END $$;

------------------------------------------
-- Support System
------------------------------------------

-- Create support posts table
CREATE TABLE IF NOT EXISTS public.support_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for support posts
ALTER TABLE public.support_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for support posts
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view support posts" ON support_posts;
    DROP POLICY IF EXISTS "Users can create support posts" ON support_posts;
    DROP POLICY IF EXISTS "Users can delete support posts" ON support_posts;
    
    -- Create new policies
    CREATE POLICY "Users can view support posts"
        ON support_posts FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can create support posts"
        ON support_posts FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete support posts"
        ON support_posts FOR DELETE
        USING (auth.uid() = user_id);
END $$;

-- Create support responses table
CREATE TABLE IF NOT EXISTS public.support_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.support_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for support responses
ALTER TABLE public.support_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for support responses
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view support responses" ON support_responses;
    DROP POLICY IF EXISTS "Users can create support responses" ON support_responses;
    DROP POLICY IF EXISTS "Users can delete support responses" ON support_responses;
    
    -- Create new policies
    CREATE POLICY "Users can view support responses"
        ON support_responses FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can create support responses"
        ON support_responses FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete support responses"
        ON support_responses FOR DELETE
        USING (auth.uid() = user_id);
END $$;

------------------------------------------
-- Notifications System
------------------------------------------

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can create notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can delete notifications" ON notifications;
    
    -- Create new policies
    CREATE POLICY "Users can view notifications"
        ON notifications FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can create notifications"
        ON notifications FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete notifications"
        ON notifications FOR DELETE
        USING (auth.uid() = user_id);
END $$;

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
CREATE INDEX IF NOT EXISTS events_created_by_idx ON events(created_by);
CREATE INDEX IF NOT EXISTS events_group_id_idx ON events(group_id);
CREATE INDEX IF NOT EXISTS events_start_time_idx ON events(start_time);
CREATE INDEX IF NOT EXISTS event_participants_event_id_idx ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS event_participants_user_id_idx ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS dating_profiles_user_id_idx ON dating_profiles(user_id);
CREATE INDEX IF NOT EXISTS dating_matches_sender_id_idx ON dating_matches(sender_id);
CREATE INDEX IF NOT EXISTS dating_matches_receiver_id_idx ON dating_matches(receiver_id);
CREATE INDEX IF NOT EXISTS dating_matches_compatibility_score_idx ON dating_matches(compatibility_score DESC);
CREATE INDEX IF NOT EXISTS confessions_user_id_idx ON confessions(user_id);
CREATE INDEX IF NOT EXISTS confession_comments_confession_id_idx ON confession_comments(confession_id);
CREATE INDEX IF NOT EXISTS confession_likes_confession_id_idx ON confession_likes(confession_id);
CREATE INDEX IF NOT EXISTS memes_user_id_idx ON memes(user_id);
CREATE INDEX IF NOT EXISTS meme_comments_meme_id_idx ON meme_comments(meme_id);
CREATE INDEX IF NOT EXISTS meme_comments_user_id_idx ON meme_comments(user_id);
CREATE INDEX IF NOT EXISTS meme_likes_meme_id_idx ON meme_likes(meme_id);
CREATE INDEX IF NOT EXISTS meme_likes_user_id_idx ON meme_likes(user_id);
CREATE INDEX IF NOT EXISTS support_posts_created_by_idx ON support_posts(created_by);
CREATE INDEX IF NOT EXISTS support_responses_post_id_idx ON support_responses(post_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read); 