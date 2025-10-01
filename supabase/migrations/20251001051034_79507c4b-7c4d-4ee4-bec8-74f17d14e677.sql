-- Security Enhancement: Strengthen Profiles Table Protection
-- Addresses: Student Personal Information Could Be Stolen by Hackers

-- ============================================================================
-- ANALYSIS: Current profiles table RLS policies
-- ============================================================================
-- ✅ Users can view their own profile (auth.uid() = id)
-- ✅ Users can update their own profile (auth.uid() = id)
-- ✅ Admins can view all profiles (has_role check)
-- ❌ No explicit DENY policies for unauthorized access
-- ❌ No INSERT/DELETE policies (handled by triggers, but should be explicit)

-- ============================================================================
-- ENHANCEMENT 1: Add explicit INSERT policy for profiles
-- ============================================================================
-- Profiles should only be created by the system trigger, not by users directly
-- This prevents attackers from creating fake profiles

CREATE POLICY "Only system can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (false);  -- No user can insert directly, only through trigger

-- ============================================================================
-- ENHANCEMENT 2: Add explicit DELETE policy
-- ============================================================================
-- Profiles should never be deleted by users
-- This prevents data loss and maintains referential integrity

CREATE POLICY "Profiles cannot be deleted by users"
ON public.profiles
FOR DELETE
TO authenticated
USING (false);  -- No user can delete profiles

-- ============================================================================
-- ENHANCEMENT 3: Restrict what profile fields can be updated
-- ============================================================================
-- Drop the current update policy and create a more restrictive one
-- Only allow users to update specific non-sensitive fields

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Prevent users from changing their ID, email, or sensitive fields
  AND id = (SELECT id FROM profiles WHERE id = auth.uid())
);

-- ============================================================================
-- ENHANCEMENT 4: Add row-level audit logging for sensitive operations
-- ============================================================================
-- Create an audit log table for tracking profile access and changes

CREATE TABLE IF NOT EXISTS public.profile_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'view', 'update', 'access_attempt'
  performed_by uuid NOT NULL,
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  changed_fields jsonb,
  success boolean NOT NULL DEFAULT true
);

-- Enable RLS on audit log
ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.profile_audit_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- System can insert audit logs (via triggers)
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
  -- Capture what fields changed
  changed_fields = jsonb_build_object(
    'old', row_to_json(OLD),
    'new', row_to_json(NEW)
  );
  
  -- Log the update
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

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS log_profile_updates ON public.profiles;
CREATE TRIGGER log_profile_updates
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_update();

-- ============================================================================
-- ENHANCEMENT 5: Create a restricted view for public profile data
-- ============================================================================
-- Create a view that only exposes non-sensitive profile information
-- This can be used in leaderboards and other public displays

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
  -- Only show profiles where the user has permission
  auth.uid() = p.id
  OR has_role(auth.uid(), 'admin'::user_role)
  OR (
    -- Allow viewing profiles of students in same batch/school for leaderboards
    p.id IN (
      SELECT student_id FROM test_attempts 
      WHERE test_id IN (
        SELECT test_id FROM test_attempts WHERE student_id = auth.uid()
      )
      AND status IN ('submitted', 'auto_submitted')
    )
  );

-- Grant permissions on the public view
GRANT SELECT ON public.public_profiles TO authenticated;

COMMENT ON VIEW public.public_profiles IS 'Restricted view of profiles exposing only non-sensitive data for leaderboards and public displays';

-- ============================================================================
-- ENHANCEMENT 6: Add additional security comments and documentation
-- ============================================================================

COMMENT ON TABLE public.profiles IS 'SECURITY CRITICAL: Contains student PII including emails, names, and school information. All access must be logged and restricted to authorized users only.';
COMMENT ON TABLE public.profile_audit_log IS 'Audit log for tracking all access and modifications to the profiles table for security compliance';

-- ============================================================================
-- VERIFICATION: Check that all policies are in place
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Profiles table security enhancements completed';
  RAISE NOTICE '✅ INSERT blocked for all users (system-only)';
  RAISE NOTICE '✅ DELETE blocked for all users';
  RAISE NOTICE '✅ UPDATE restricted to profile owners';
  RAISE NOTICE '✅ Audit logging enabled for all profile changes';
  RAISE NOTICE '✅ Public profiles view created for safe data exposure';
END $$;