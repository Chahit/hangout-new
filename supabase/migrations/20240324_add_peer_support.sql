-- Create support posts table
CREATE TABLE IF NOT EXISTS public.support_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  is_anonymous boolean DEFAULT false NOT NULL,
  is_resolved boolean DEFAULT false NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create support responses table
CREATE TABLE IF NOT EXISTS public.support_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  post_id uuid REFERENCES public.support_posts(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_anonymous boolean DEFAULT false NOT NULL,
  is_accepted boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.support_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_responses ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
    -- Policies for support posts
    DROP POLICY IF EXISTS "Users can view all support posts" ON support_posts;
    DROP POLICY IF EXISTS "Users can create support posts" ON support_posts;
    DROP POLICY IF EXISTS "Users can update own support posts" ON support_posts;
    DROP POLICY IF EXISTS "Users can delete own support posts" ON support_posts;
    
    CREATE POLICY "Users can view all support posts"
        ON support_posts FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can create support posts"
        ON support_posts FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
    
    CREATE POLICY "Users can update own support posts"
        ON support_posts FOR UPDATE
        USING (auth.uid() = created_by);
    
    CREATE POLICY "Users can delete own support posts"
        ON support_posts FOR DELETE
        USING (auth.uid() = created_by);
    
    -- Policies for support responses
    DROP POLICY IF EXISTS "Users can view all support responses" ON support_responses;
    DROP POLICY IF EXISTS "Users can create support responses" ON support_responses;
    DROP POLICY IF EXISTS "Users can update own support responses" ON support_responses;
    DROP POLICY IF EXISTS "Users can delete own support responses" ON support_responses;
    
    CREATE POLICY "Users can view all support responses"
        ON support_responses FOR SELECT
        USING (true);
    
    CREATE POLICY "Users can create support responses"
        ON support_responses FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
    
    CREATE POLICY "Users can update own support responses"
        ON support_responses FOR UPDATE
        USING (auth.uid() = created_by);
    
    CREATE POLICY "Users can delete own support responses"
        ON support_responses FOR DELETE
        USING (auth.uid() = created_by);
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS support_posts_created_by_idx ON support_posts(created_by);
CREATE INDEX IF NOT EXISTS support_posts_category_idx ON support_posts(category);
CREATE INDEX IF NOT EXISTS support_posts_created_at_idx ON support_posts(created_at);
CREATE INDEX IF NOT EXISTS support_responses_post_id_idx ON support_responses(post_id);
CREATE INDEX IF NOT EXISTS support_responses_created_by_idx ON support_responses(created_by); 