-- Drop the group_messages table if it exists
DROP TABLE IF EXISTS public.group_messages;

-- Ensure messages table has the correct structure
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view messages in their groups" ON messages;
    DROP POLICY IF EXISTS "Users can insert messages in their groups" ON messages;
    
    -- Create new policies
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
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS messages_group_id_idx ON messages(group_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC); 