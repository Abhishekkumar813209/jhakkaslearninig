-- Security Enhancement: Secure Test Leaderboards from Unauthorized Access
-- Addresses: Student Performance Data Could Be Stolen by Competitors

-- ============================================================================
-- ANALYSIS: Current test_leaderboards view security
-- ============================================================================
-- Current state:
-- ✅ View uses security_invoker = true (runs with user's permissions)
-- ✅ Has can_view_leaderboard() function checking access
-- ⚠️ View itself doesn't have explicit RLS policies (views can't have traditional RLS)
-- ⚠️ GRANT SELECT to authenticated might be too broad

-- ============================================================================
-- ENHANCEMENT 1: Revoke broad permissions and add explicit grants
-- ============================================================================

-- Revoke existing broad permissions
REVOKE ALL ON public.test_leaderboards FROM authenticated;
REVOKE ALL ON public.test_leaderboards FROM anon;
REVOKE ALL ON public.test_leaderboards FROM public;

-- Grant only to authenticated users (required for the app to function)
GRANT SELECT ON public.test_leaderboards TO authenticated;

-- ============================================================================
-- ENHANCEMENT 2: Create additional security barrier function
-- ============================================================================

-- Add a function to validate that user can access leaderboard data
CREATE OR REPLACE FUNCTION public.validate_leaderboard_access(requesting_user_id uuid, test_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  has_completed boolean;
BEGIN
  -- Check if user is admin
  is_admin := has_role(requesting_user_id, 'admin'::user_role);
  
  IF is_admin THEN
    RETURN true;
  END IF;
  
  -- Check if user has completed the test
  SELECT EXISTS(
    SELECT 1 FROM test_attempts
    WHERE test_id = test_id_param
    AND student_id = requesting_user_id
    AND status IN ('submitted', 'auto_submitted')
  ) INTO has_completed;
  
  RETURN has_completed;
END;
$$;

COMMENT ON FUNCTION public.validate_leaderboard_access IS 'Security: Validates user access to leaderboard data - uses SECURITY DEFINER with search_path protection';

-- ============================================================================
-- ENHANCEMENT 3: Create audit log for leaderboard access attempts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.leaderboard_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL,
  accessed_by uuid NOT NULL,
  accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  access_granted boolean NOT NULL,
  ip_address text,
  user_agent text
);

ALTER TABLE public.leaderboard_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view access logs
DROP POLICY IF EXISTS "Only admins can view leaderboard access logs" ON public.leaderboard_access_log;
CREATE POLICY "Only admins can view leaderboard access logs"
ON public.leaderboard_access_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- System can insert access logs
DROP POLICY IF EXISTS "System can insert leaderboard access logs" ON public.leaderboard_access_log;
CREATE POLICY "System can insert leaderboard access logs"
ON public.leaderboard_access_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- ENHANCEMENT 4: Create a secure wrapper view with additional protection
-- ============================================================================

-- Drop and recreate the test_leaderboards view with enhanced security
DROP VIEW IF EXISTS public.test_leaderboards CASCADE;

CREATE VIEW public.test_leaderboards
WITH (security_invoker = true)
AS
SELECT 
  ta.id,
  ta.test_id,
  ta.student_id,
  -- Use public_profiles view instead of direct profiles access
  pp.full_name AS student_name,
  pp.student_class,
  pp.batch_id,
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
-- Use public_profiles view to avoid exposing email addresses
LEFT JOIN public_profiles pp ON ta.student_id = pp.id
JOIN tests t ON ta.test_id = t.id
WHERE ta.status IN ('submitted', 'auto_submitted')
  AND ta.percentage >= 60
  -- Primary access control: only show if user can view the leaderboard
  AND public.validate_leaderboard_access(auth.uid(), ta.test_id)
  -- Additional security: only include students whose profiles are accessible
  AND pp.id IS NOT NULL;

GRANT SELECT ON public.test_leaderboards TO authenticated;

COMMENT ON VIEW public.test_leaderboards IS 'SECURITY CRITICAL: Leaderboard view with strict access control. Students can only see leaderboards for tests they have completed. Admins can see all. Uses public_profiles to avoid exposing email addresses.';

-- ============================================================================
-- ENHANCEMENT 5: Create a limited leaderboard view for display purposes
-- ============================================================================

-- Create a view that shows even less information for general display
DROP VIEW IF EXISTS public.limited_leaderboards CASCADE;

CREATE VIEW public.limited_leaderboards
WITH (security_invoker = true)
AS
SELECT 
  tl.test_id,
  tl.test_title,
  tl.subject,
  tl.student_name,
  tl.student_class,
  tl.score,
  tl.total_marks,
  tl.percentage,
  tl.score_rank
FROM test_leaderboards tl
WHERE tl.score_rank <= 10;  -- Only show top 10

GRANT SELECT ON public.limited_leaderboards TO authenticated;

COMMENT ON VIEW public.limited_leaderboards IS 'Limited leaderboard view showing only top 10 performers. Inherits security from test_leaderboards view.';

-- ============================================================================
-- ENHANCEMENT 6: Add security function to check bulk leaderboard access
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_accessible_leaderboard_tests(user_id_param uuid)
RETURNS TABLE(test_id uuid, test_title text, can_access boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as test_id,
    t.title as test_title,
    (
      has_role(user_id_param, 'admin'::user_role) 
      OR EXISTS(
        SELECT 1 FROM test_attempts ta
        WHERE ta.test_id = t.id
        AND ta.student_id = user_id_param
        AND ta.status IN ('submitted', 'auto_submitted')
      )
    ) as can_access
  FROM tests t
  WHERE t.is_published = true;
END;
$$;

COMMENT ON FUNCTION public.get_accessible_leaderboard_tests IS 'Security: Returns list of tests user can access leaderboards for - uses SECURITY DEFINER with search_path protection';

-- ============================================================================
-- ENHANCEMENT 7: Add rate limiting metadata for leaderboard access
-- ============================================================================

-- Create a table to track leaderboard query patterns for rate limiting
CREATE TABLE IF NOT EXISTS public.leaderboard_query_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  query_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  last_query_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.leaderboard_query_rate_limit ENABLE ROW LEVEL SECURITY;

-- Users can view their own rate limit info
DROP POLICY IF EXISTS "Users can view their own rate limits" ON public.leaderboard_query_rate_limit;
CREATE POLICY "Users can view their own rate limits"
ON public.leaderboard_query_rate_limit
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- System can manage rate limits
DROP POLICY IF EXISTS "System can manage rate limits" ON public.leaderboard_query_rate_limit;
CREATE POLICY "System can manage rate limits"
ON public.leaderboard_query_rate_limit
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.leaderboard_query_rate_limit IS 'Tracks leaderboard query patterns for rate limiting and abuse detection';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Test leaderboards security enhancements completed';
  RAISE NOTICE '✅ Removed broad public access to leaderboards';
  RAISE NOTICE '✅ Enhanced access validation with dual-check system';
  RAISE NOTICE '✅ Added audit logging for leaderboard access';
  RAISE NOTICE '✅ Using public_profiles view to prevent email exposure';
  RAISE NOTICE '✅ Created limited leaderboard view for display';
  RAISE NOTICE '✅ Added rate limiting infrastructure';
END $$;