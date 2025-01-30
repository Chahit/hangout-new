-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  location text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  is_public boolean DEFAULT false NOT NULL,
  max_participants integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create event participants table
CREATE TABLE IF NOT EXISTS public.event_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('going', 'maybe', 'not_going')) NOT NULL DEFAULT 'going',
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view public events" ON events;
    DROP POLICY IF EXISTS "Group members can view group events" ON events;
    DROP POLICY IF EXISTS "Users can create events" ON events;
    DROP POLICY IF EXISTS "Event creators can update events" ON events;
    DROP POLICY IF EXISTS "Event creators can delete events" ON events;
    
    -- Create events policies
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

    -- Drop existing participant policies
    DROP POLICY IF EXISTS "Users can view event participants" ON event_participants;
    DROP POLICY IF EXISTS "Users can join/leave events" ON event_participants;
    DROP POLICY IF EXISTS "Users can update their participation status" ON event_participants;
    
    -- Create participant policies
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
CREATE INDEX IF NOT EXISTS events_created_by_idx ON events(created_by);
CREATE INDEX IF NOT EXISTS events_group_id_idx ON events(group_id);
CREATE INDEX IF NOT EXISTS events_start_time_idx ON events(start_time);
CREATE INDEX IF NOT EXISTS event_participants_event_id_idx ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS event_participants_user_id_idx ON event_participants(user_id); 