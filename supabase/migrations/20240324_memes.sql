-- Create memes table
CREATE TABLE IF NOT EXISTS public.memes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  media_url text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_email text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create meme comments table
CREATE TABLE IF NOT EXISTS public.meme_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meme_id uuid REFERENCES public.memes(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_email text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create meme likes table
CREATE TABLE IF NOT EXISTS public.meme_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meme_id uuid REFERENCES public.memes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(meme_id, user_id)
);

-- Enable RLS
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meme_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meme_likes ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
    -- Policies for memes
    DROP POLICY IF EXISTS "Anyone can view memes" ON public.memes;
    DROP POLICY IF EXISTS "Authenticated users can create memes" ON public.memes;
    
    CREATE POLICY "Anyone can view memes"
        ON public.memes FOR SELECT
        USING (true);
        
    CREATE POLICY "Authenticated users can create memes"
        ON public.memes FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');

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