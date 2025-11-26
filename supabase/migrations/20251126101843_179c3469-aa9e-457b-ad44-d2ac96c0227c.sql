-- Create table for parent password reset OTP tracking
CREATE TABLE IF NOT EXISTS public.parent_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp TEXT NOT NULL,
  reset_id UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parent_password_resets_phone ON public.parent_password_resets(phone);
CREATE INDEX IF NOT EXISTS idx_parent_password_resets_reset_id ON public.parent_password_resets(reset_id);
CREATE INDEX IF NOT EXISTS idx_parent_password_resets_expires_at ON public.parent_password_resets(expires_at);

-- Enable RLS
ALTER TABLE public.parent_password_resets ENABLE ROW LEVEL SECURITY;

-- Create policy: No direct access from frontend (only via edge functions)
CREATE POLICY "Only edge functions can access" ON public.parent_password_resets
  FOR ALL USING (FALSE);