-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with domain-aware role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
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
  
  -- Determine role based on email domain
  IF NEW.email LIKE '%@parent.app' THEN
    v_role := 'parent'::user_role;
  ELSIF (SELECT COUNT(*) FROM auth.users) = 1 THEN
    v_role := 'admin'::user_role;
  ELSE
    v_role := 'student'::user_role;
  END IF;
  
  -- Assign role (ON CONFLICT DO NOTHING allows Edge Function to override if needed)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Idempotent repair: Fix any existing @parent.app users that have wrong role
UPDATE user_roles ur
SET role = 'parent'
FROM profiles p
WHERE ur.user_id = p.id
  AND p.email LIKE '%@parent.app'
  AND ur.role NOT IN ('admin', 'parent');

-- Log count of fixed records
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % parent role assignments', fixed_count;
END $$;