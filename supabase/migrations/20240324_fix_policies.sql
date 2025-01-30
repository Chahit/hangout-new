-- Safely create or update direct_messages policies
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their direct messages" ON direct_messages;
    DROP POLICY IF EXISTS "Users can send direct messages" ON direct_messages;
    DROP POLICY IF EXISTS "Users can update message reactions" ON direct_messages;
    
    -- Create new policies
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'direct_messages' 
        AND policyname = 'Users can view their direct messages'
    ) THEN
        CREATE POLICY "Users can view their direct messages"
            ON direct_messages FOR SELECT
            USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'direct_messages' 
        AND policyname = 'Users can send direct messages'
    ) THEN
        CREATE POLICY "Users can send direct messages"
            ON direct_messages FOR INSERT
            WITH CHECK (auth.uid() = sender_id);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'direct_messages' 
        AND policyname = 'Users can update message reactions'
    ) THEN
        CREATE POLICY "Users can update message reactions"
            ON direct_messages FOR UPDATE
            USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    END IF;
END $$; 