-- Add social share tracking to daily_attendance
ALTER TABLE public.daily_attendance
ADD COLUMN IF NOT EXISTS social_share_done BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS social_share_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_share_date DATE;

-- Create index to ensure only 1 share reward per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_share_limit 
ON public.daily_attendance(student_id, last_share_date) 
WHERE social_share_done = true;

-- Create social_shares table for tracking share codes
CREATE TABLE IF NOT EXISTS public.social_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_code TEXT UNIQUE NOT NULL,
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  clicks_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  xp_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on social_shares
ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;

-- Students can view their own shares
CREATE POLICY "Students can view their own shares"
ON public.social_shares
FOR SELECT
USING (auth.uid() = student_id);

-- Students can create their own shares
CREATE POLICY "Students can insert their own shares"
ON public.social_shares
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Admins can view all shares
CREATE POLICY "Admins can view all shares"
ON public.social_shares
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));