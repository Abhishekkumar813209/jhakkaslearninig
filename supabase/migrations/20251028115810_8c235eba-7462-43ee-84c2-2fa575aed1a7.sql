-- Drop the old increment_student_xp RPC function
-- This is no longer needed as we're using jhakkas-points-system edge function for all XP updates
DROP FUNCTION IF EXISTS public.increment_student_xp(uuid, integer);