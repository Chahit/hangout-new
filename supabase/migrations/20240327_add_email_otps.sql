-- Create email_otps table
CREATE TABLE IF NOT EXISTS public.email_otps (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email text NOT NULL,
  otp text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS email_otps_email_idx ON public.email_otps (email);
CREATE INDEX IF NOT EXISTS email_otps_otp_idx ON public.email_otps (otp);
CREATE INDEX IF NOT EXISTS email_otps_expires_at_idx ON public.email_otps (expires_at);

-- Add RLS policies
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for service role only" 
  ON public.email_otps FOR INSERT 
  TO service_role 
  WITH CHECK (true);

CREATE POLICY "Enable delete for service role only" 
  ON public.email_otps FOR DELETE 
  TO service_role 
  USING (true); 