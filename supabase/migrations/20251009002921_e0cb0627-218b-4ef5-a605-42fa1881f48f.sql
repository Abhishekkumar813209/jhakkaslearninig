-- Phase 1: Remove Coins System & Consolidate to XP ("Jhakkas Points")

-- Rename student_xp_coins to student_gamification
ALTER TABLE public.student_xp_coins RENAME TO student_gamification;

-- Remove coins-related columns
ALTER TABLE public.student_gamification 
DROP COLUMN IF EXISTS total_coins,
ADD COLUMN IF NOT EXISTS daily_attendance_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS social_share_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_xp INTEGER DEFAULT 0;

-- Rename total_xp to make it clearer (optional, keeping same for compatibility)
COMMENT ON COLUMN public.student_gamification.total_xp IS 'Jhakkas Points - consolidated XP system';

-- Update trigger to use new table name
DROP TRIGGER IF EXISTS create_student_xp_coins_trigger ON auth.users;

CREATE OR REPLACE FUNCTION public.create_student_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.student_gamification (student_id)
  VALUES (NEW.id)
  ON CONFLICT (student_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_student_gamification_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_student_gamification();