-- Drop existing foreign key constraints if they exist
ALTER TABLE IF EXISTS public.events 
  DROP CONSTRAINT IF EXISTS events_created_by_fkey;

-- Recreate foreign key constraints to reference profiles
ALTER TABLE public.events
  ADD CONSTRAINT events_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Drop existing foreign key constraints for event_participants if they exist
ALTER TABLE IF EXISTS public.event_participants 
  DROP CONSTRAINT IF EXISTS event_participants_user_id_fkey;

-- Recreate foreign key constraints to reference profiles
ALTER TABLE public.event_participants
  ADD CONSTRAINT event_participants_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE; 