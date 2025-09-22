-- Enable RLS on test_answers table
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;

-- Allow students to insert their own test answers
CREATE POLICY "Students can insert their test answers" 
ON public.test_answers 
FOR INSERT 
WITH CHECK (
  attempt_id IN (
    SELECT id FROM public.test_attempts 
    WHERE student_id = auth.uid()
  )
);

-- Allow students to update their own test answers
CREATE POLICY "Students can update their test answers" 
ON public.test_answers 
FOR UPDATE 
USING (
  attempt_id IN (
    SELECT id FROM public.test_attempts 
    WHERE student_id = auth.uid()
  )
);

-- Allow students to view their own test answers
CREATE POLICY "Students can view their test answers" 
ON public.test_answers 
FOR SELECT 
USING (
  attempt_id IN (
    SELECT id FROM public.test_attempts 
    WHERE student_id = auth.uid()
  )
);

-- Allow admins to view all test answers
CREATE POLICY "Admins can view all test answers" 
ON public.test_answers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow instructors to view answers for their tests
CREATE POLICY "Instructors can view answers for their tests" 
ON public.test_answers 
FOR SELECT 
USING (
  question_id IN (
    SELECT q.id FROM questions q 
    JOIN tests t ON q.test_id = t.id 
    WHERE t.created_by = auth.uid()
  )
);