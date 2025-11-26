-- Fix RLS policies for parent_student_links to allow legitimate inserts

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Students can create links to their parents" ON parent_student_links;
DROP POLICY IF EXISTS "Students can view their parent links" ON parent_student_links;
DROP POLICY IF EXISTS "Parents can view their student links" ON parent_student_links;
DROP POLICY IF EXISTS "Admins can insert parent-student links" ON parent_student_links;
DROP POLICY IF EXISTS "Admins can update parent-student links" ON parent_student_links;
DROP POLICY IF EXISTS "Admins can delete parent-student links" ON parent_student_links;
DROP POLICY IF EXISTS "Admins can manage parent-student links" ON parent_student_links;
DROP POLICY IF EXISTS "Parents can view their linked students" ON parent_student_links;

-- SELECT policies: Allow students and parents to view their own links
CREATE POLICY "Students and parents can view their links" 
ON parent_student_links 
FOR SELECT 
USING (
  auth.uid() = student_id 
  OR auth.uid() = parent_id
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- INSERT policy: Allow students to create links for themselves, admins to create any
CREATE POLICY "Students can link to parents" 
ON parent_student_links 
FOR INSERT 
WITH CHECK (
  auth.uid() = student_id 
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- UPDATE policy: Only admins can update links
CREATE POLICY "Admins can update links" 
ON parent_student_links 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- DELETE policy: Only admins can delete links
CREATE POLICY "Admins can delete links" 
ON parent_student_links 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create a SECURITY DEFINER function for system-level inserts (e.g., during signup)
-- This bypasses RLS for legitimate system operations
CREATE OR REPLACE FUNCTION public.create_parent_student_link(
  p_parent_id UUID,
  p_student_id UUID,
  p_relationship TEXT DEFAULT 'parent'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id UUID;
BEGIN
  -- Insert the link (will succeed even if RLS would block it)
  INSERT INTO public.parent_student_links (
    parent_id,
    student_id,
    relationship,
    is_primary_contact
  )
  VALUES (
    p_parent_id,
    p_student_id,
    COALESCE(p_relationship, 'parent'),
    true
  )
  ON CONFLICT (parent_id, student_id) DO NOTHING
  RETURNING id INTO v_link_id;
  
  -- Return the link ID (or NULL if already existed)
  RETURN v_link_id;
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION public.create_parent_student_link IS 
'Creates a parent-student link bypassing RLS. Used for system-level operations like signup flows.';

COMMENT ON POLICY "Students can link to parents" ON parent_student_links IS 
'Allows authenticated students to create links to parent profiles where the student_id matches their auth.uid()';

COMMENT ON POLICY "Students and parents can view their links" ON parent_student_links IS 
'Allows students and parents to view links where they are either the student or parent';