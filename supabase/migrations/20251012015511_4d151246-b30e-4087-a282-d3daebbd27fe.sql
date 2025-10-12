-- Drop existing view if it exists
DROP VIEW IF EXISTS public_profiles CASCADE;

-- Create public_profiles view with only non-sensitive data
CREATE VIEW public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  student_class
FROM profiles;

-- Grant SELECT access to authenticated users
GRANT SELECT ON public_profiles TO authenticated, anon;

-- Add comment for documentation
COMMENT ON VIEW public_profiles IS 'Public view of profiles exposing only non-sensitive data for leaderboards';
