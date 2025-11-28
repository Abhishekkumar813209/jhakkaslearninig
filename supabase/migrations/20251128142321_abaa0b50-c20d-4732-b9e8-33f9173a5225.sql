-- Function to cascade delete auth.users when profiles row is deleted
CREATE OR REPLACE FUNCTION public.cascade_delete_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the user from auth.users
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Trigger to automatically delete auth.users when profiles is deleted
CREATE TRIGGER on_profile_delete_cascade_auth
  AFTER DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_delete_auth_user();