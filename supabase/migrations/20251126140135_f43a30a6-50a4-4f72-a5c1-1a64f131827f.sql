-- Add unique constraint on phone_number to prevent duplicate accounts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_phone_number_unique'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_phone_number_unique UNIQUE (phone_number);
  END IF;
END $$;

-- Add index for faster phone number lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);

-- Drop existing policies if they exist before creating new ones
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Students can create links to their parents" ON parent_student_links;
  DROP POLICY IF EXISTS "Students can view their parent links" ON parent_student_links;
  DROP POLICY IF EXISTS "Parents can view their student links" ON parent_student_links;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if policies don't exist
  NULL;
END $$;

-- Add RLS policy to allow students to create parent_student_links
CREATE POLICY "Students can create links to their parents" 
ON parent_student_links 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

-- Add RLS policy to allow students and parents to view links
CREATE POLICY "Students can view their parent links" 
ON parent_student_links 
FOR SELECT 
USING (auth.uid() = student_id OR auth.uid() = parent_id);

-- Add helpful comment
COMMENT ON CONSTRAINT profiles_phone_number_unique ON profiles 
IS 'Ensures phone numbers are unique across all users (students and parents)';