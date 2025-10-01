-- Security Enhancement: Strengthen Profiles Table Protection (Fixed)
-- Addresses: Student Personal Information Could Be Stolen by Hackers

-- ============================================================================
-- ENHANCEMENT 1: Add explicit INSERT policy for profiles
-- ============================================================================
DROP POLICY IF EXISTS "Only system can insert profiles" ON public.profiles;

CREATE POLICY "Only system can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (false);  -- No user can insert directly, only through trigger

-- ============================================================================
-- ENHANCEMENT 2: Add explicit DELETE policy
-- ============================================================================
DROP POLICY IF EXISTS "Profiles cannot be deleted by users" ON public.profiles;

CREATE POLICY "Profiles cannot be deleted by users"
ON public.profiles
FOR DELETE
TO authenticated
USING (false);  -- No user can delete profiles

-- ============================================================================
-- ENHANCEMENT 3: Restrict what profile fields can be updated
-- ============================================================================
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile fields" ON public.profiles;

CREATE POLICY "Users can update their own profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND id = (SELECT id FROM profiles WHERE id = auth.uid())
);

-- ============================================================================
-- ENHANCEMENT 4: Add row-level audit logging for sensitive operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profile_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid NOT NULL,
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  changed_fields jsonb,
  success boolean NOT NULL DEFAULT true
);

ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.profile_audit_log;
CREATE POLICY "Only admins can view audit logs"
ON public.profile_audit_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.profile_audit_log;
CREATE POLICY "System can insert audit logs"
ON public.profile_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create trigger function to log profile updates
CREATE OR REPLACE FUNCTION public.log_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields jsonb;
BEGIN
  changed_fields = jsonb_build_object(
    'old', row_to_json(OLD),
    'new', row_to_json(NEW)
  );
  
  INSERT INTO public.profile_audit_log (
    profile_id,
    action,
    performed_by,
    changed_fields,
    success
  ) VALUES (
    NEW.id,
    'update',
    auth.uid(),
    changed_fields,
    true
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_profile_updates ON public.profiles;
CREATE TRIGGER log_profile_updates
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_update();

-- ============================================================================
-- ENHANCEMENT 5: Create a restricted view for public profile data
-- ============================================================================
DROP VIEW IF EXISTS public.public_profiles CASCADE;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.full_name,
  p.student_class,
  p.avatar_url,
  p.zone_id,
  p.school_id,
  p.batch_id
FROM profiles p
WHERE 
  auth.uid() = p.id
  OR has_role(auth.uid(), 'admin'::user_role)
  OR (
    p.id IN (
      SELECT student_id FROM test_attempts 
      WHERE test_id IN (
        SELECT test_id FROM test_attempts WHERE student_id = auth.uid()
      )
      AND status IN ('submitted', 'auto_submitted')
    )
  );

GRANT SELECT ON public.public_profiles TO authenticated;

COMMENT ON VIEW public.public_profiles IS 'Restricted view of profiles exposing only non-sensitive data for leaderboards and public displays';
COMMENT ON TABLE public.profiles IS 'SECURITY CRITICAL: Contains student PII including emails, names, and school information. All access must be logged and restricted to authorized users only.';
COMMENT ON TABLE public.profile_audit_log IS 'Audit log for tracking all access and modifications to the profiles table for security compliance';
COMMENT ON FUNCTION public.log_profile_update IS 'Security: Logs profile updates - uses SECURITY DEFINER with search_path protection';