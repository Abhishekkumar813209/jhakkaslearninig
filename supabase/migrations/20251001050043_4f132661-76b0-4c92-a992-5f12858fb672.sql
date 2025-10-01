
-- Add RLS policies for test_leaderboards view
-- Since views don't support RLS directly, we add policies via a security definer function

-- Create a security definer function to check if user can view leaderboards
CREATE OR REPLACE FUNCTION public.can_view_leaderboard(test_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Students can view leaderboards for tests they've completed
  -- Admins can view all leaderboards
  SELECT EXISTS (
    SELECT 1 FROM public.test_attempts 
    WHERE test_id = test_id_param 
    AND student_id = auth.uid() 
    AND status IN ('submitted', 'auto_submitted')
  ) OR public.has_role(auth.uid(), 'admin'::user_role);
$$;

-- Drop the existing view
DROP VIEW IF EXISTS public.test_leaderboards CASCADE;

-- Recreate the view with better structure
CREATE VIEW public.test_leaderboards
WITH (security_invoker = true)
AS
SELECT 
  ta.id,
  ta.test_id,
  ta.student_id,
  p.full_name AS student_name,
  p.student_class,
  p.batch_id,
  ta.score,
  ta.percentage,
  ta.total_marks,
  ta.time_taken_minutes,
  ta.submitted_at,
  t.title AS test_title,
  t.subject,
  ROW_NUMBER() OVER (PARTITION BY ta.test_id ORDER BY ta.score DESC, ta.time_taken_minutes) AS score_rank,
  ROW_NUMBER() OVER (PARTITION BY ta.test_id ORDER BY ta.time_taken_minutes) AS speed_rank,
  ROW_NUMBER() OVER (PARTITION BY ta.test_id ORDER BY ((ta.score::float / ta.total_marks::float) * 100) DESC) AS accuracy_rank
FROM test_attempts ta
JOIN profiles p ON ta.student_id = p.id
JOIN tests t ON ta.test_id = t.id
WHERE ta.status IN ('submitted', 'auto_submitted')
  AND ta.percentage >= 60
  -- Apply access control: only show if user can view the leaderboard
  AND public.can_view_leaderboard(ta.test_id);

-- Grant appropriate permissions
GRANT SELECT ON public.test_leaderboards TO authenticated;

COMMENT ON VIEW public.test_leaderboards IS 'Leaderboard view with access control - students can only see leaderboards for tests they have completed, admins can see all';
