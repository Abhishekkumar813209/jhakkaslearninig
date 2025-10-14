-- Add xp_awarded and share_id to daily_attendance for reliable share XP tracking
ALTER TABLE public.daily_attendance
  ADD COLUMN IF NOT EXISTS xp_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_id TEXT;

-- Ensure a share_id cannot be reused (idempotency) while allowing NULLs
CREATE UNIQUE INDEX IF NOT EXISTS daily_attendance_share_id_unique
ON public.daily_attendance (share_id) WHERE share_id IS NOT NULL;