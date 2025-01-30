-- Create confessions table
CREATE TABLE IF NOT EXISTS public.confessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  anonymous_name text NOT NULL,
  media_url text,
  media_type text CHECK (media_type IN ('image', 'video')),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create confession comments table
CREATE TABLE IF NOT EXISTS public.confession_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  confession_id uuid REFERENCES public.confessions(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  anonymous_name text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create confession likes table
CREATE TABLE IF NOT EXISTS public.confession_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  confession_id uuid REFERENCES public.confessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(confession_id, user_id)
);

-- Enable RLS
ALTER TABLE public.confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confession_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confession_likes ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
    -- Policies for confessions
    DROP POLICY IF EXISTS "Anyone can view confessions" ON public.confessions;
    DROP POLICY IF EXISTS "Authenticated users can create confessions" ON public.confessions;
    
    CREATE POLICY "Anyone can view confessions"
        ON public.confessions FOR SELECT
        USING (true);
        
    CREATE POLICY "Authenticated users can create confessions"
        ON public.confessions FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');

    -- Policies for confession comments
    DROP POLICY IF EXISTS "Anyone can view confession comments" ON public.confession_comments;
    DROP POLICY IF EXISTS "Authenticated users can create confession comments" ON public.confession_comments;
    
    CREATE POLICY "Anyone can view confession comments"
        ON public.confession_comments FOR SELECT
        USING (true);
        
    CREATE POLICY "Authenticated users can create confession comments"
        ON public.confession_comments FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');

    -- Policies for confession likes
    DROP POLICY IF EXISTS "Anyone can view confession likes" ON public.confession_likes;
    DROP POLICY IF EXISTS "Authenticated users can manage confession likes" ON public.confession_likes;
    
    CREATE POLICY "Anyone can view confession likes"
        ON public.confession_likes FOR SELECT
        USING (true);
        
    CREATE POLICY "Authenticated users can manage confession likes"
        ON public.confession_likes FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
END $$; 