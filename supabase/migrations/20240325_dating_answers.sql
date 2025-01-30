-- Create dating_answers table
CREATE TABLE IF NOT EXISTS public.dating_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, question_number)
);

-- Enable RLS
ALTER TABLE public.dating_answers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own answers"
    ON public.dating_answers
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own answers"
    ON public.dating_answers
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own answers"
    ON public.dating_answers
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX dating_answers_user_id_idx ON public.dating_answers(user_id);
CREATE INDEX dating_answers_question_number_idx ON public.dating_answers(question_number); 