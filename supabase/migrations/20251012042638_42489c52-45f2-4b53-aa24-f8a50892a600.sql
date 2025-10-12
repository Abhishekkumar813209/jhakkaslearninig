-- Create RPC function to search parents by phone number
CREATE OR REPLACE FUNCTION public.search_parents_by_phone(phone_like text)
RETURNS TABLE(id uuid, full_name text, phone_number text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH input AS (
    SELECT regexp_replace(COALESCE(phone_like, ''), '[^0-9]', '', 'g') AS q_digits
  ), pnorm AS (
    SELECT 
      p.id, 
      p.full_name, 
      p.phone_number, 
      p.email,
      regexp_replace(COALESCE(p.phone_number, ''), '[^0-9]', '', 'g') AS ph_digits
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'parent'::user_role
  )
  SELECT p.id, p.full_name, p.phone_number, p.email
  FROM pnorm p, input i
  WHERE has_role(auth.uid(), 'admin'::user_role)
    AND (
      p.phone_number ILIKE '%' || phone_like || '%'
      OR (
        length(i.q_digits) >= 3 
        AND right(p.ph_digits, GREATEST(3, LEAST(10, length(i.q_digits)))) = right(i.q_digits, GREATEST(3, LEAST(10, length(i.q_digits))))
      )
    )
  ORDER BY p.full_name NULLS LAST
  LIMIT 20;
$$;