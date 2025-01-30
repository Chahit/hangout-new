-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.dating_matches CASCADE;
DROP TABLE IF EXISTS public.dating_profiles CASCADE;

-- Create dating_profiles table
CREATE TABLE public.dating_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create dating_matches table
CREATE TABLE public.dating_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    compatibility_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT status_check CHECK (status IN ('pending', 'accept', 'reject')),
    UNIQUE(sender_id, receiver_id)
);

-- Create dating_messages table
CREATE TABLE public.dating_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES public.dating_matches(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.dating_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dating_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dating_messages ENABLE ROW LEVEL SECURITY;

-- Dating profiles policies
CREATE POLICY "Users can view all dating profiles"
    ON public.dating_profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can manage their own dating profile"
    ON public.dating_profiles FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Dating matches policies
CREATE POLICY "Users can view their matches"
    ON public.dating_matches FOR SELECT
    USING (auth.uid() IN (sender_id, receiver_id));

CREATE POLICY "Users can create match requests"
    ON public.dating_matches FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their match status"
    ON public.dating_matches FOR UPDATE
    USING (auth.uid() = receiver_id);

-- Dating messages policies
CREATE POLICY "Users can view messages in their matches"
    ON public.dating_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.dating_matches
            WHERE id = match_id
            AND (sender_id = auth.uid() OR receiver_id = auth.uid())
            AND status = 'accept'
        )
    );

CREATE POLICY "Users can send messages in accepted matches"
    ON public.dating_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.dating_matches
            WHERE id = match_id
            AND (sender_id = auth.uid() OR receiver_id = auth.uid())
            AND status = 'accept'
        )
        AND sender_id = auth.uid()
    );

-- Create indexes for better performance
CREATE INDEX dating_profiles_user_id_idx ON public.dating_profiles(user_id);
CREATE INDEX dating_matches_sender_id_idx ON public.dating_matches(sender_id);
CREATE INDEX dating_matches_receiver_id_idx ON public.dating_matches(receiver_id);
CREATE INDEX dating_messages_match_id_idx ON public.dating_messages(match_id);
CREATE INDEX dating_messages_sender_id_idx ON public.dating_messages(sender_id); 