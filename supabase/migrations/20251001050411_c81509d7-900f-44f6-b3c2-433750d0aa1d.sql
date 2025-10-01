-- Security Fix Migration: Address Critical RLS and Function Security Issues

-- ============================================================================
-- FIX 1: Update achievements table RLS policies
-- ============================================================================
-- Remove overly permissive policy that allows anyone to view all achievements
DROP POLICY IF EXISTS "Students can view all achievements for hall of fame" ON public.achievements;

-- Add more restrictive policy: Students can view achievements for completed tests only
CREATE POLICY "Students can view achievements for tests they completed"
ON public.achievements
FOR SELECT
TO authenticated
USING (
  -- Students can see achievements for tests they have completed
  test_id IN (
    SELECT test_id FROM public.test_attempts 
    WHERE student_id = auth.uid() 
    AND status IN ('submitted', 'auto_submitted')
  )
  OR 
  -- Or their own achievements
  student_id = auth.uid()
  OR
  -- Admins can see all
  public.has_role(auth.uid(), 'admin'::user_role)
);

-- ============================================================================
-- FIX 2: Add RLS policies to video_progress table
-- ============================================================================
-- Students can view their own video progress
CREATE POLICY "Students can view their own video progress"
ON public.video_progress
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Students can insert their own video progress
CREATE POLICY "Students can insert their own video progress"
ON public.video_progress
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- Students can update their own video progress
CREATE POLICY "Students can update their own video progress"
ON public.video_progress
FOR UPDATE
TO authenticated
USING (student_id = auth.uid());

-- Admins can manage all video progress
CREATE POLICY "Admins can manage all video progress"
ON public.video_progress
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- ============================================================================
-- FIX 3: Add search_path to database functions missing this configuration
-- ============================================================================

-- Fix has_completed_test function
CREATE OR REPLACE FUNCTION public.has_completed_test(test_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.test_attempts 
    WHERE test_id = test_id_param 
    AND student_id = auth.uid() 
    AND status = 'submitted'
  );
$$;

-- Fix has_active_subscription function
CREATE OR REPLACE FUNCTION public.has_active_subscription(student_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.test_subscriptions 
    WHERE student_id = student_id_param 
    AND status = 'active'
    AND (end_date IS NULL OR end_date > now())
    AND subscription_type = 'premium'
  );
$$;

-- Fix can_see_question_answers function
CREATE OR REPLACE FUNCTION public.can_see_question_answers(question_test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.test_attempts 
    WHERE test_id = question_test_id 
    AND student_id = auth.uid() 
    AND status = 'submitted'
  );
$$;

-- Fix has_used_free_test function
CREATE OR REPLACE FUNCTION public.has_used_free_test(student_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.test_subscriptions 
    WHERE student_id = student_id_param 
    AND subscription_type = 'free'
    AND free_test_used = true
  );
$$;

-- Fix get_subscription_status function
CREATE OR REPLACE FUNCTION public.get_subscription_status(student_id_param uuid)
RETURNS TABLE(subscription_type text, status text, free_test_available boolean, premium_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile only if it doesn't exist
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();
  
  -- Assign default role only if no role exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN (SELECT COUNT(*) FROM auth.users) = 1 THEN 'admin'::user_role
      ELSE 'student'::user_role
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.has_completed_test IS 'Security: Checks if user completed a test - uses SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.has_active_subscription IS 'Security: Checks if user has active subscription - uses SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.can_see_question_answers IS 'Security: Checks if user can see test answers - uses SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.has_used_free_test IS 'Security: Checks if user used free test - uses SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.get_subscription_status IS 'Security: Gets user subscription status - uses SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.handle_new_user IS 'Security: Handles new user creation - uses SECURITY DEFINER with search_path protection';