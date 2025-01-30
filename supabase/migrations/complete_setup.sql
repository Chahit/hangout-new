-- Create profiles table
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

-- Enable RLS for groups and group_members
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create policies for groups and group_members
DO $$ 
BEGIN
    -- Drop existing group policies
    DROP POLICY IF EXISTS "Enable read access for all users" ON groups;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON groups;
    DROP POLICY IF EXISTS "Enable update for group creators" ON groups;
    DROP POLICY IF EXISTS "Enable delete for group creators" ON groups;
    
    -- Create group policies
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
        
    -- Drop existing group_members policies
    DROP POLICY IF EXISTS "Enable read access for all users" ON group_members;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON group_members;
    DROP POLICY IF EXISTS "Enable delete own membership" ON group_members;
    
    -- Create group_members policies
    CREATE POLICY "Enable read access for all users"
        ON group_members FOR SELECT
        USING (true);
    
    CREATE POLICY "Enable insert for authenticated users"
        ON group_members FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Enable delete own membership"
        ON group_members FOR DELETE
        USING (auth.uid() = user_id);
END $$;

-- Create messages table with all necessary fields
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

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Enable read access for group members" ON messages;
    DROP POLICY IF EXISTS "Enable insert for group members" ON messages;
    DROP POLICY IF EXISTS "Enable update for message creators" ON messages;
    DROP POLICY IF EXISTS "Enable delete for message creators" ON messages;
    
    -- Create new policies
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
                SELECT 1 FROM group_members
                WHERE group_members.group_id = messages.group_id
                AND group_members.user_id = auth.uid()
                AND group_members.role IN ('admin', 'moderator')
            )
        );
    
    CREATE POLICY "Enable delete for message creators"
        ON messages FOR DELETE
        USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = messages.group_id
                AND group_members.user_id = auth.uid()
                AND group_members.role IN ('admin', 'moderator')
            )
        );
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS messages_group_id_idx ON messages(group_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS messages_type_idx ON messages(type);

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  reactions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for direct_messages
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for direct_messages
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their direct messages" ON direct_messages;
    DROP POLICY IF EXISTS "Users can send direct messages" ON direct_messages;
    DROP POLICY IF EXISTS "Users can update message reactions" ON direct_messages;
    
    CREATE POLICY "Users can view their direct messages"
        ON direct_messages FOR SELECT
        USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    
    CREATE POLICY "Users can send direct messages"
        ON direct_messages FOR INSERT
        WITH CHECK (auth.uid() = sender_id);
    
    CREATE POLICY "Users can update message reactions"
        ON direct_messages FOR UPDATE
        USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
END $$;

-- Create events table
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

-- Enable RLS for events and event_participants
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for events
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view public events" ON events;
    DROP POLICY IF EXISTS "Group members can view group events" ON events;
    DROP POLICY IF EXISTS "Users can create events" ON events;
    DROP POLICY IF EXISTS "Event creators can update events" ON events;
    DROP POLICY IF EXISTS "Event creators can delete events" ON events;
    
    CREATE POLICY "Users can view public events"
        ON events FOR SELECT
        USING (is_public = true);
    
    CREATE POLICY "Group members can view group events"
        ON events FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = events.group_id
                AND group_members.user_id = auth.uid()
            )
        );
    
    CREATE POLICY "Users can create events"
        ON events FOR INSERT
        WITH CHECK (
            -- Allow if it's a public event
            (is_public = true AND auth.uid() IS NOT NULL)
            OR
            -- Allow if user is a member of the group
            (group_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM group_members
                WHERE group_members.group_id = events.group_id
                AND group_members.user_id = auth.uid()
            ))
        );
    
    CREATE POLICY "Event creators can update events"
        ON events FOR UPDATE
        USING (auth.uid() = created_by);
    
    CREATE POLICY "Event creators can delete events"
        ON events FOR DELETE
        USING (auth.uid() = created_by);

    -- Create policies for event participants
    DROP POLICY IF EXISTS "Users can view event participants" ON event_participants;
    DROP POLICY IF EXISTS "Users can join/leave events" ON event_participants;
    DROP POLICY IF EXISTS "Users can update their participation status" ON event_participants;
    
    CREATE POLICY "Users can view event participants"
        ON event_participants FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM events
                WHERE events.id = event_participants.event_id
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
    
    CREATE POLICY "Users can join/leave events"
        ON event_participants FOR INSERT
        WITH CHECK (
            auth.uid() = user_id
            AND
            EXISTS (
                SELECT 1 FROM events
                WHERE events.id = event_participants.event_id
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
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS groups_created_by_idx ON groups(created_by);
CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON group_members(user_id);
CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON group_members(group_id);
CREATE INDEX IF NOT EXISTS groups_code_idx ON groups(code);
CREATE INDEX IF NOT EXISTS messages_group_id_idx ON messages(group_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS direct_messages_sender_id_idx ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS direct_messages_receiver_id_idx ON direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS events_created_by_idx ON events(created_by);
CREATE INDEX IF NOT EXISTS events_group_id_idx ON events(group_id);
CREATE INDEX IF NOT EXISTS events_start_time_idx ON events(start_time);
CREATE INDEX IF NOT EXISTS event_participants_event_id_idx ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS event_participants_user_id_idx ON event_participants(user_id);

-- Create memes tables
CREATE TABLE IF NOT EXISTS public.memes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  media_url text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_email text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.meme_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meme_id uuid REFERENCES public.memes(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_email text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.meme_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meme_id uuid REFERENCES public.memes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(meme_id, user_id)
);

-- Enable RLS for memes tables
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meme_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meme_likes ENABLE ROW LEVEL SECURITY;

-- Create indexes for memes tables
CREATE INDEX IF NOT EXISTS memes_user_id_idx ON memes(user_id);
CREATE INDEX IF NOT EXISTS meme_comments_meme_id_idx ON meme_comments(meme_id);
CREATE INDEX IF NOT EXISTS meme_comments_user_id_idx ON meme_comments(user_id);
CREATE INDEX IF NOT EXISTS meme_likes_meme_id_idx ON meme_likes(meme_id);
CREATE INDEX IF NOT EXISTS meme_likes_user_id_idx ON meme_likes(user_id);

-- Policies for memes table
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Anyone can view memes" ON public.memes;
    DROP POLICY IF EXISTS "Authenticated users can create memes" ON public.memes;
    DROP POLICY IF EXISTS "Users can delete their own memes" ON public.memes;
    
    -- Create new policies
    CREATE POLICY "Anyone can view memes"
        ON public.memes FOR SELECT
        USING (true);
        
    CREATE POLICY "Authenticated users can create memes"
        ON public.memes FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
        
    CREATE POLICY "Users can delete their own memes"
        ON public.memes FOR DELETE
        USING (auth.uid() = user_id);

    -- Policies for meme comments
    DROP POLICY IF EXISTS "Anyone can view meme comments" ON public.meme_comments;
    DROP POLICY IF EXISTS "Authenticated users can create meme comments" ON public.meme_comments;
    
    CREATE POLICY "Anyone can view meme comments"
        ON public.meme_comments FOR SELECT
        USING (true);
        
    CREATE POLICY "Authenticated users can create meme comments"
        ON public.meme_comments FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');

    -- Policies for meme likes
    DROP POLICY IF EXISTS "Anyone can view meme likes" ON public.meme_likes;
    DROP POLICY IF EXISTS "Authenticated users can manage meme likes" ON public.meme_likes;
    
    CREATE POLICY "Anyone can view meme likes"
        ON public.meme_likes FOR SELECT
        USING (true);
        
    CREATE POLICY "Authenticated users can manage meme likes"
        ON public.meme_likes FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
END $$;

-- Create and configure storage bucket for memes
DO $$
BEGIN
    -- Enable storage if not already enabled
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Create storage bucket for memes if it doesn't exist
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('memes', 'memes', true)
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
            AND (owner)::text = (auth.uid())::text
        );
END $$; 