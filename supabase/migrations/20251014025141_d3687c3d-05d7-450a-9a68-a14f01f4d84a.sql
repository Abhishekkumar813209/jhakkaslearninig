-- Phase 1: Immediate fix for testcbse9@gmail.com
-- Generate retroactive share_ids for legacy shares
UPDATE daily_attendance
SET share_id = CONCAT('LEGACY-', id::text)
WHERE student_id = 'c03c799b-ffcb-49b3-aa54-de7c1ef40a38'
AND social_share_done = true
AND share_id IS NULL;

-- Credit the missing 10 XP (5 per share × 2 shares)
UPDATE student_gamification
SET 
  total_xp = total_xp + 10,
  social_share_xp = social_share_xp + 10,
  level = CASE 
    WHEN total_xp + 10 >= level * 100 THEN level + 1
    ELSE level
  END,
  updated_at = NOW()
WHERE student_id = 'c03c799b-ffcb-49b3-aa54-de7c1ef40a38';

-- Mark legacy shares as awarded
UPDATE daily_attendance
SET xp_awarded = true
WHERE student_id = 'c03c799b-ffcb-49b3-aa54-de7c1ef40a38'
AND social_share_done = true
AND xp_awarded = false;

-- Phase 4: Create XP award queue table for reliable processing
CREATE TABLE IF NOT EXISTS public.xp_award_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  share_id TEXT NOT NULL UNIQUE,
  xp_amount INTEGER NOT NULL DEFAULT 5,
  activity_type TEXT NOT NULL DEFAULT 'social_share',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Enable RLS on queue table
ALTER TABLE public.xp_award_queue ENABLE ROW LEVEL SECURITY;

-- Students can view their own queue items
CREATE POLICY "Students can view own queue items"
ON public.xp_award_queue
FOR SELECT
USING (auth.uid() = student_id);

-- Students can insert their own queue items
CREATE POLICY "Students can insert own queue items"
ON public.xp_award_queue
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- System can update queue items
CREATE POLICY "System can update queue items"
ON public.xp_award_queue
FOR UPDATE
USING (true);

-- Admins can manage all queue items
CREATE POLICY "Admins can manage queue"
ON public.xp_award_queue
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_xp_queue_pending ON public.xp_award_queue(status, scheduled_for) 
WHERE status = 'pending';

-- Phase 6: Add constraint to ensure share_id is always set for completed shares
-- Note: We skip this for now to avoid breaking existing data, will add after cleanup