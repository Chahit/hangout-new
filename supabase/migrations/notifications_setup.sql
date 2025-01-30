-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('match_request', 'match_accepted', 'new_message')),
  data jsonb NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    -- Users can view their own notifications
    CREATE POLICY "Users can view their own notifications"
        ON public.notifications FOR SELECT
        USING (auth.uid() = user_id);

    -- Users can update their own notifications (mark as read)
    CREATE POLICY "Users can update their own notifications"
        ON public.notifications FOR UPDATE
        USING (auth.uid() = user_id);

    -- System can insert notifications
    CREATE POLICY "System can insert notifications"
        ON public.notifications FOR INSERT
        WITH CHECK (true);
END $$;

-- Function to create match request notification
CREATE OR REPLACE FUNCTION create_match_request_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, data)
    VALUES (
        NEW.receiver_id,
        'match_request',
        jsonb_build_object(
            'match_id', NEW.id,
            'sender_id', NEW.sender_id,
            'compatibility_score', NEW.compatibility_score
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create match accepted notification
CREATE OR REPLACE FUNCTION create_match_accepted_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        INSERT INTO public.notifications (user_id, type, data)
        VALUES (
            NEW.sender_id,
            'match_accepted',
            jsonb_build_object(
                'match_id', NEW.id,
                'receiver_id', NEW.receiver_id
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new message notification
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    match_record RECORD;
BEGIN
    -- Get match info
    SELECT * INTO match_record FROM dating_matches WHERE id = NEW.match_id;
    
    -- Create notification for the other user
    INSERT INTO public.notifications (user_id, type, data)
    VALUES (
        CASE 
            WHEN NEW.sender_id = match_record.sender_id THEN match_record.receiver_id
            ELSE match_record.sender_id
        END,
        'new_message',
        jsonb_build_object(
            'match_id', NEW.match_id,
            'message_id', NEW.id,
            'sender_id', NEW.sender_id
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_match_request ON public.dating_matches;
CREATE TRIGGER on_match_request
    AFTER INSERT ON public.dating_matches
    FOR EACH ROW
    EXECUTE FUNCTION create_match_request_notification();

DROP TRIGGER IF EXISTS on_match_accepted ON public.dating_matches;
CREATE TRIGGER on_match_accepted
    AFTER UPDATE ON public.dating_matches
    FOR EACH ROW
    EXECUTE FUNCTION create_match_accepted_notification();

DROP TRIGGER IF EXISTS on_new_message ON public.dating_messages;
CREATE TRIGGER on_new_message
    AFTER INSERT ON public.dating_messages
    FOR EACH ROW
    EXECUTE FUNCTION create_message_notification(); 