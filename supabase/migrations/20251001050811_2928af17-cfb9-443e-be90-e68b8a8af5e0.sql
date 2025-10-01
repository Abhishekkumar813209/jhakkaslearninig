-- Security Fix Part 4: Fix has_role function search_path syntax

-- Fix has_role function - change SET search_path TO 'public' to SET search_path = public
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, check_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = has_role.user_id 
    AND role = check_role
  );
$$;

COMMENT ON FUNCTION public.has_role IS 'Security: Checks if user has role - uses SECURITY DEFINER with search_path protection';