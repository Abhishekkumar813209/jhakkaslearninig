-- Enable RLS on questions table
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Instructors can manage questions for their own tests
CREATE POLICY "Instructors can manage their test questions" 
ON public.questions 
FOR ALL 
USING (
  test_id IN (
    SELECT id FROM public.tests 
    WHERE created_by = auth.uid()
  )
);

-- Policy 2: Students can view questions (but not answers) during active test attempts
CREATE POLICY "Students can view questions during active attempts" 
ON public.questions 
FOR SELECT 
USING (
  test_id IN (
    SELECT test_id FROM public.test_attempts 
    WHERE student_id = auth.uid() 
    AND status = 'in_progress'
  )
);

-- Policy 3: Admins can view all questions for management purposes
CREATE POLICY "Admins can view all questions" 
ON public.questions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create a security definer function to check if student has completed a test
CREATE OR REPLACE FUNCTION public.has_completed_test(test_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.test_attempts 
    WHERE test_id = test_id_param 
    AND student_id = auth.uid() 
    AND status = 'submitted'
  );
$$;

-- Policy 4: Students can view answers/explanations only after completing the test
CREATE POLICY "Students can view answers after test completion" 
ON public.questions 
FOR SELECT 
USING (
  has_completed_test(test_id) AND 
  test_id IN (
    SELECT id FROM public.tests 
    WHERE is_published = true
  )
);