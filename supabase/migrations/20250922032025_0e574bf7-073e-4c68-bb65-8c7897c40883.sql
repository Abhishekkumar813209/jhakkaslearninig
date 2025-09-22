-- Fix the questions table RLS policies for admin access
-- Drop existing restrictive policies and create proper admin access

DROP POLICY IF EXISTS "Admins can view all questions" ON public.questions;
DROP POLICY IF EXISTS "Instructors can manage their test questions" ON public.questions;
DROP POLICY IF EXISTS "Students can view answers after test completion" ON public.questions;
DROP POLICY IF EXISTS "Students can view questions during active attempts" ON public.questions;

-- Create comprehensive admin and instructor policies for questions
CREATE POLICY "Admins have full access to all questions" 
ON public.questions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Instructors can view and manage questions for their tests" 
ON public.questions 
FOR ALL 
USING (
  test_id IN (
    SELECT id FROM public.tests 
    WHERE created_by = auth.uid() OR has_role(auth.uid(), 'admin'::user_role)
  )
);

CREATE POLICY "Students can view questions during active test attempts" 
ON public.questions 
FOR SELECT 
USING (
  test_id IN (
    SELECT test_id FROM public.test_attempts 
    WHERE student_id = auth.uid() AND status = 'in_progress'::test_attempt_status
  )
);

CREATE POLICY "Students can view published test questions" 
ON public.questions 
FOR SELECT 
USING (
  test_id IN (
    SELECT id FROM public.tests 
    WHERE is_published = true
  )
);

-- Also ensure tests table has proper admin access
DROP POLICY IF EXISTS "Instructors can manage their tests" ON public.tests;
DROP POLICY IF EXISTS "Students can view tests of enrolled courses" ON public.tests;

CREATE POLICY "Admins have full access to all tests" 
ON public.tests 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Instructors can manage their own tests" 
ON public.tests 
FOR ALL 
USING (created_by = auth.uid());

CREATE POLICY "Students can view published tests" 
ON public.tests 
FOR SELECT 
USING (is_published = true);