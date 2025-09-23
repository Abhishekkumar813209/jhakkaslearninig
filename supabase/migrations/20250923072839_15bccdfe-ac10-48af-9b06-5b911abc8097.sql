-- First, let's create the missing profile for this user
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  '4f3ef101-0bcb-4671-9fb0-07a6ec197b18'::uuid,
  'abhishek.kumar.chy21@itbhu.ac.in',
  'Abhishek Kumar 5-Year IDD Chemistry'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = '4f3ef101-0bcb-4671-9fb0-07a6ec197b18'::uuid
);

-- Update the handle_new_user trigger to handle cases where profile already exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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