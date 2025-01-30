-- Create dating_profiles table
CREATE TABLE IF NOT EXISTS public.dating_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  answers jsonb NOT NULL, -- Stores question answers as {question_id: selected_option}
  bio text,
  looking_for text[], -- Array of interests they're looking for
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- Create dating_matches table
CREATE TABLE IF NOT EXISTS public.dating_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'rejected')) NOT NULL DEFAULT 'pending',
  compatibility_score float NOT NULL, -- Score between 0 and 1
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(sender_id, receiver_id)
);

-- Create dating_messages table
CREATE TABLE IF NOT EXISTS public.dating_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid REFERENCES public.dating_matches(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.dating_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dating_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dating_messages ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    -- Dating Profiles Policies
    CREATE POLICY "Users can view their own dating profile"
        ON public.dating_profiles FOR SELECT
        USING (auth.uid() = user_id);
        
    CREATE POLICY "Users can view potential matches' profiles"
        ON public.dating_profiles FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = dating_profiles.user_id
                AND profiles.batch = (
                    SELECT batch FROM profiles WHERE id = auth.uid()
                )
            )
        );
        
    CREATE POLICY "Users can create their dating profile"
        ON public.dating_profiles FOR INSERT
        WITH CHECK (auth.uid() = user_id);
        
    CREATE POLICY "Users can update their own dating profile"
        ON public.dating_profiles FOR UPDATE
        USING (auth.uid() = user_id);

    -- Dating Matches Policies
    CREATE POLICY "Users can view their matches"
        ON public.dating_matches FOR SELECT
        USING (
            auth.uid() = sender_id OR 
            auth.uid() = receiver_id
        );
        
    CREATE POLICY "Users can create match requests"
        ON public.dating_matches FOR INSERT
        WITH CHECK (auth.uid() = sender_id);
        
    CREATE POLICY "Users can update their match status"
        ON public.dating_matches FOR UPDATE
        USING (auth.uid() = receiver_id);

    -- Dating Messages Policies
    CREATE POLICY "Users can view messages in their matches"
        ON public.dating_messages FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM dating_matches
                WHERE dating_matches.id = dating_messages.match_id
                AND (
                    dating_matches.sender_id = auth.uid() OR
                    dating_matches.receiver_id = auth.uid()
                )
                AND dating_matches.status = 'accepted'
            )
        );
        
    CREATE POLICY "Users can send messages to their matches"
        ON public.dating_messages FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM dating_matches
                WHERE dating_matches.id = dating_messages.match_id
                AND (
                    dating_matches.sender_id = auth.uid() OR
                    dating_matches.receiver_id = auth.uid()
                )
                AND dating_matches.status = 'accepted'
            )
        );
END $$; 