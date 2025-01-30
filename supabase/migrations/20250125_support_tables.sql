-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.support_post_likes CASCADE;
DROP TABLE IF EXISTS public.support_responses CASCADE;
DROP TABLE IF EXISTS public.support_posts CASCADE;

-- Create support_posts table
CREATE TABLE public.support_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    media_url TEXT,
    category TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create support_responses table
CREATE TABLE public.support_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.support_posts(id) ON DELETE CASCADE NOT NULL,
    media_url TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create support_post_likes table
CREATE TABLE public.support_post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.support_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(post_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.support_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_post_likes ENABLE ROW LEVEL SECURITY;

-- Policies for support_posts
CREATE POLICY "Users can view all support posts"
    ON public.support_posts FOR SELECT
    USING (true);

CREATE POLICY "Users can create support posts"
    ON public.support_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
    ON public.support_posts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
    ON public.support_posts FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for support_responses
CREATE POLICY "Users can view all responses"
    ON public.support_responses FOR SELECT
    USING (true);

CREATE POLICY "Users can create responses"
    ON public.support_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses"
    ON public.support_responses FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own responses"
    ON public.support_responses FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for support_post_likes
CREATE POLICY "Users can view all likes"
    ON public.support_post_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can create likes"
    ON public.support_post_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
    ON public.support_post_likes FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX support_posts_user_id_idx ON public.support_posts(user_id);
CREATE INDEX support_posts_category_idx ON public.support_posts(category);
CREATE INDEX support_responses_post_id_idx ON public.support_responses(post_id);
CREATE INDEX support_responses_user_id_idx ON public.support_responses(user_id);
CREATE INDEX support_post_likes_post_id_idx ON public.support_post_likes(post_id);
CREATE INDEX support_post_likes_user_id_idx ON public.support_post_likes(user_id);
