-- Drop existing tables to avoid conflicts
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.group_members;
DROP TABLE IF EXISTS public.groups;

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    code text UNIQUE,
    is_private boolean DEFAULT false NOT NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role text CHECK (role IN ('member', 'moderator', 'admin')) NOT NULL DEFAULT 'member',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, user_id)
);

-- Create messages table with simplified schema
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content text NOT NULL,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies with ultra-simplified logic
DO $$ 
BEGIN
    -- Drop all existing policies
    DROP POLICY IF EXISTS "Groups read access" ON groups;
    DROP POLICY IF EXISTS "Groups insert access" ON groups;
    DROP POLICY IF EXISTS "Groups update access" ON groups;
    DROP POLICY IF EXISTS "Groups delete access" ON groups;
    DROP POLICY IF EXISTS "Group members read access" ON group_members;
    DROP POLICY IF EXISTS "Group members insert access" ON group_members;
    DROP POLICY IF EXISTS "Group members update access" ON group_members;
    DROP POLICY IF EXISTS "Group members delete access" ON group_members;
    DROP POLICY IF EXISTS "Messages read access" ON messages;
    DROP POLICY IF EXISTS "Messages insert access" ON messages;
    DROP POLICY IF EXISTS "Messages update access" ON messages;
    DROP POLICY IF EXISTS "Messages delete access" ON messages;

    -- Groups policies
    CREATE POLICY "Groups read access"
        ON groups FOR SELECT
        TO authenticated
        USING (true); -- Allow all authenticated users to see all groups
    
    CREATE POLICY "Groups insert access"
        ON groups FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);
    
    CREATE POLICY "Groups update access"
        ON groups FOR UPDATE
        TO authenticated
        USING (created_by = auth.uid());
    
    CREATE POLICY "Groups delete access"
        ON groups FOR DELETE
        TO authenticated
        USING (created_by = auth.uid());

    -- Group members policies (ultra-simplified)
    CREATE POLICY "Group members read access"
        ON group_members FOR SELECT
        TO authenticated
        USING (true);
    
    CREATE POLICY "Group members insert access"
        ON group_members FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM groups
                WHERE id = group_members.group_id
                AND created_by = auth.uid()
            )
        );
    
    CREATE POLICY "Group members update access"
        ON group_members FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM groups
                WHERE id = group_members.group_id
                AND created_by = auth.uid()
            )
        );
    
    CREATE POLICY "Group members delete access"
        ON group_members FOR DELETE
        TO authenticated
        USING (
            user_id = auth.uid() -- Users can remove themselves
            OR EXISTS (
                SELECT 1 FROM groups
                WHERE id = group_members.group_id
                AND created_by = auth.uid()
            )
        );

    -- Messages policies (ultra-simplified)
    CREATE POLICY "Messages read access"
        ON messages FOR SELECT
        TO authenticated
        USING (true);
    
    CREATE POLICY "Messages insert access"
        ON messages FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);
    
    CREATE POLICY "Messages update access"
        ON messages FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid());
    
    CREATE POLICY "Messages delete access"
        ON messages FOR DELETE
        TO authenticated
        USING (user_id = auth.uid());
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS groups_created_by_idx ON groups(created_by);
CREATE INDEX IF NOT EXISTS groups_code_idx ON groups(code);
CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON group_members(group_id);
CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON group_members(user_id);
CREATE INDEX IF NOT EXISTS messages_group_id_idx ON messages(group_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC); 