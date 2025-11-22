-- Fix student_leagues RLS policy to handle NULL cases and prevent authentication errors
-- Drop the current policy that's too restrictive
DROP POLICY IF EXISTS "Students can view league leaderboard" ON public.student_leagues;

-- Create updated policy that gracefully handles NULL cases (new students without league entries)
CREATE POLICY "Students can view league leaderboard" 
  ON public.student_leagues 
  FOR SELECT 
  USING (
    -- Allow if same league week OR user has no league yet (returns all) OR user is admin
    (public.get_user_league_week(auth.uid()) IS NULL OR league_week_start = public.get_user_league_week(auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::user_role)
  );

-- Grant execute permissions to ensure authenticated users can call the security definer function
GRANT EXECUTE ON FUNCTION public.get_user_league_week(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_league_week(uuid) TO public;