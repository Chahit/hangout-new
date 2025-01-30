-- Add notification_preferences and privacy_settings columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT jsonb_build_object(
  'email_notifications', true,
  'dating_notifications', true,
  'group_notifications', true,
  'event_notifications', true,
  'support_notifications', true
);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT jsonb_build_object(
  'show_online_status', true,
  'show_last_seen', true,
  'show_email', true,
  'show_batch', true,
  'show_branch', true
);

-- Update existing rows to have default values
UPDATE public.profiles 
SET notification_preferences = jsonb_build_object(
  'email_notifications', true,
  'dating_notifications', true,
  'group_notifications', true,
  'event_notifications', true,
  'support_notifications', true
)
WHERE notification_preferences IS NULL;

UPDATE public.profiles 
SET privacy_settings = jsonb_build_object(
  'show_online_status', true,
  'show_last_seen', true,
  'show_email', true,
  'show_batch', true,
  'show_branch', true
)
WHERE privacy_settings IS NULL; 