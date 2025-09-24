-- Fix get_subscription_status function to handle cases where no subscription exists
CREATE OR REPLACE FUNCTION public.get_subscription_status(student_id_param UUID)
RETURNS TABLE(
  subscription_type TEXT,
  status TEXT,
  free_test_available BOOLEAN,
  premium_active BOOLEAN
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH subscription_data AS (
    SELECT 
      ts.subscription_type,
      ts.status,
      ts.free_test_used,
      ts.created_at
    FROM public.test_subscriptions ts
    WHERE ts.student_id = student_id_param
    ORDER BY ts.created_at DESC
    LIMIT 1
  )
  SELECT 
    COALESCE(sd.subscription_type, 'none') as subscription_type,
    COALESCE(sd.status, 'none') as status,
    NOT COALESCE(sd.free_test_used, false) as free_test_available,
    EXISTS(
      SELECT 1 FROM public.test_subscriptions ts2
      WHERE ts2.student_id = student_id_param 
      AND ts2.status = 'active'
      AND (ts2.end_date IS NULL OR ts2.end_date > now())
      AND ts2.subscription_type = 'premium'
    ) as premium_active
  FROM (SELECT 1) dummy
  LEFT JOIN subscription_data sd ON true;
$$;