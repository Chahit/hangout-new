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