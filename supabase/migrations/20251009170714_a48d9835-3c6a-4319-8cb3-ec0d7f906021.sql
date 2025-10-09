-- Phase 9: Daily Attendance System

-- Create daily_attendance table
CREATE TABLE IF NOT EXISTS public.daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  xp_earned INTEGER DEFAULT 5,
  streak_days INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own attendance"
  ON public.daily_attendance
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can mark their own attendance"
  ON public.daily_attendance
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can view all attendance"
  ON public.daily_attendance
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
  ON public.daily_attendance(student_id, date DESC);

-- Function to calculate and update streak
CREATE OR REPLACE FUNCTION public.update_attendance_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_yesterday_attendance RECORD;
  v_new_streak INTEGER;
BEGIN
  -- Check if user attended yesterday
  SELECT * INTO v_yesterday_attendance
  FROM public.daily_attendance
  WHERE student_id = NEW.student_id
    AND date = NEW.date - INTERVAL '1 day'
  LIMIT 1;
  
  IF FOUND THEN
    -- Continue streak
    v_new_streak := v_yesterday_attendance.streak_days + 1;
  ELSE
    -- Start new streak
    v_new_streak := 1;
  END IF;
  
  NEW.streak_days := v_new_streak;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-calculate streak before insert
CREATE TRIGGER calculate_attendance_streak
  BEFORE INSERT ON public.daily_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_attendance_streak();