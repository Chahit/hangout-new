-- Drop existing indexes if they exist
DROP INDEX IF EXISTS direct_messages_sender_receiver_idx;
DROP INDEX IF EXISTS direct_messages_created_at_idx;

-- Add foreign key references to profiles table
ALTER TABLE public.direct_messages
DROP CONSTRAINT IF EXISTS direct_messages_sender_id_fkey,
DROP CONSTRAINT IF EXISTS direct_messages_receiver_id_fkey,
ADD CONSTRAINT direct_messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE,
ADD CONSTRAINT direct_messages_receiver_id_fkey
    FOREIGN KEY (receiver_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;

-- Create composite indexes for better query performance
CREATE INDEX IF NOT EXISTS direct_messages_sender_receiver_created_idx 
ON direct_messages(sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS direct_messages_receiver_sender_created_idx 
ON direct_messages(receiver_id, sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS direct_messages_unread_idx 
ON direct_messages(receiver_id, is_read) 
WHERE is_read = false;

-- Create function to get unread message count
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

-- Create function to mark messages as read
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