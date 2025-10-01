-- Security Fix Part 3: Final function search_path fix

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_roles.user_id = get_user_role.user_id 
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_role IS 'Security: Gets user role - uses SECURITY DEFINER with search_path protection';