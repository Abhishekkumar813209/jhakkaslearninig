-- Fix RLS policies for parent_student_links to allow student linking

-- Drop existing policies if any
DROP POLICY IF EXISTS "Students can link themselves to parents" ON public.parent_student_links;
DROP POLICY IF EXISTS "Users can view their parent-student links" ON public.parent_student_links;
DROP POLICY IF EXISTS "Admins can manage all parent-student links" ON public.parent_student_links;

-- Enable RLS
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow students to insert links where they are the student
CREATE POLICY "Students can link themselves to parents"
ON public.parent_student_links
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid()
);

-- Policy 2: Allow students and parents to view their own links
CREATE POLICY "Users can view their parent-student links"
ON public.parent_student_links
FOR SELECT
TO authenticated
USING (
  parent_id = auth.uid() 
  OR student_id = auth.uid()
);

-- Policy 3: Allow admins to manage all links
CREATE POLICY "Admins can manage all parent-student links"
ON public.parent_student_links
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Ensure unique constraint allows multiple students per parent (siblings)
-- but prevents duplicate same-parent-same-student pairs
DROP INDEX IF EXISTS parent_student_links_unique_pair;
CREATE UNIQUE INDEX parent_student_links_unique_pair 
ON public.parent_student_links (parent_id, student_id);