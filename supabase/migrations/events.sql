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
    -- Drop ALL existing policies first
    DROP POLICY IF EXISTS "Users can view public events" ON events;
    DROP POLICY IF EXISTS "Group members can view group events" ON events;
    DROP POLICY IF EXISTS "Users can create events" ON events;
    DROP POLICY IF EXISTS "Event creators can update events" ON events;
    DROP POLICY IF EXISTS "Event creators can delete events" ON events;
    DROP POLICY IF EXISTS "Users can view approved public events" ON events;
    DROP POLICY IF EXISTS "Group members can view approved group events" ON events;
    DROP POLICY IF EXISTS "Admin can update events" ON events;
    DROP POLICY IF EXISTS "Admin can delete events" ON events;
    DROP POLICY IF EXISTS "Users can view their own events" ON events;
    
    -- Create new policies with approval system
    CREATE POLICY "Users can view approved public events"
        ON events FOR SELECT
        USING (
            (is_public = true AND is_approved = true)
            OR
            (auth.uid() = created_by)  -- Users can always see their own events
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
    -- Drop ALL existing policies first
    DROP POLICY IF EXISTS "Users can view event participants" ON event_participants;
    DROP POLICY IF EXISTS "Users can join/leave events" ON event_participants;
    DROP POLICY IF EXISTS "Users can update their participation status" ON event_participants;
    DROP POLICY IF EXISTS "Users can join/leave approved events" ON event_participants;
    DROP POLICY IF EXISTS "Users can manage event participation" ON event_participants;
    
    -- Create new policies
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
                    (events.created_by = auth.uid())
                    OR
                    (auth.jwt() ->> 'email' = 'an459@snu.edu.in')
                )
            )
        );
    
    CREATE POLICY "Users can manage event participation"
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS events_is_approved_idx ON events(is_approved);
CREATE INDEX IF NOT EXISTS events_created_by_idx ON events(created_by);
CREATE INDEX IF NOT EXISTS events_group_id_idx ON events(group_id);
CREATE INDEX IF NOT EXISTS events_start_time_idx ON events(start_time);
CREATE INDEX IF NOT EXISTS event_participants_event_id_idx ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS event_participants_user_id_idx ON event_participants(user_id); 