-- SECURITY FIX: Remove the dangerous policy that allows students to view all published test questions
DROP POLICY IF EXISTS "Students can view published test questions" ON public.questions;

-- SECURITY FIX: Create a more secure policy that only allows students to see questions during active attempts
-- This policy ensures students can only see questions when they have an in-progress test attempt
CREATE POLICY "Students can view questions only during active attempts" ON public.questions
FOR SELECT 
TO authenticated
USING (
  test_id IN (
    SELECT test_id 
    FROM public.test_attempts 
    WHERE student_id = auth.uid() 
    AND status = 'in_progress'
  )
);

-- SECURITY FIX: Create a policy for viewing questions after test completion (for review purposes)
-- This allows students to review questions only after they have completed the test
CREATE POLICY "Students can review questions after completion" ON public.questions
FOR SELECT 
TO authenticated
USING (
  test_id IN (
    SELECT test_id 
    FROM public.test_attempts 
    WHERE student_id = auth.uid() 
    AND status = 'submitted'
  )
);

-- SECURITY ENHANCEMENT: Ensure that questions table doesn't leak sensitive data
-- Add a view for safe question access during tests (without answers)
CREATE VIEW public.safe_questions AS
SELECT 
  id,
  test_id,
  question_text,
  question_type,
  marks,
  order_num,
  position,
  word_limit,
  tags,
  image_url,
  image_alt,
  -- Hide sensitive data during active attempts
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.test_attempts ta 
      WHERE ta.test_id = questions.test_id 
      AND ta.student_id = auth.uid() 
      AND ta.status = 'submitted'
    ) THEN correct_answer
    ELSE NULL 
  END as correct_answer,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.test_attempts ta 
      WHERE ta.test_id = questions.test_id 
      AND ta.student_id = auth.uid() 
      AND ta.status = 'submitted'
    ) THEN explanation
    ELSE NULL 
  END as explanation,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.test_attempts ta 
      WHERE ta.test_id = questions.test_id 
      AND ta.student_id = auth.uid() 
      AND ta.status = 'submitted'
    ) THEN sample_answer
    ELSE NULL 
  END as sample_answer
FROM public.questions
WHERE 
  -- Admin access
  has_role(auth.uid(), 'admin'::user_role) 
  OR 
  -- Instructor access to their own tests
  test_id IN (SELECT id FROM public.tests WHERE created_by = auth.uid())
  OR 
  -- Student access only during active attempts or after completion
  test_id IN (
    SELECT test_id 
    FROM public.test_attempts 
    WHERE student_id = auth.uid() 
    AND status IN ('in_progress', 'submitted')
  );

-- Grant appropriate permissions on the view
GRANT SELECT ON public.safe_questions TO authenticated;