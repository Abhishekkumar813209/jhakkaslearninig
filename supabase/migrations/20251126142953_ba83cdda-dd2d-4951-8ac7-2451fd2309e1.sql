-- Create RPC function to check if parent exists (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_parent_exists_by_phone_or_email(
  p_phone TEXT,
  p_email TEXT
)
RETURNS TABLE(
  parent_id UUID,
  parent_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    ur.role::TEXT
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE (p.phone_number = p_phone OR p.email = p_email)
  LIMIT 1;
END;
$$;