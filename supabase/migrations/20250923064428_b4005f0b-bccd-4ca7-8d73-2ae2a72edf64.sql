-- Fix the security definer view issue by dropping it and using proper RLS instead
DROP VIEW IF EXISTS public.safe_questions;

-- Create a function to check if user can see answers (after test completion)
CREATE OR REPLACE FUNCTION public.can_see_question_answers(question_test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.test_attempts 
    WHERE test_id = question_test_id 
    AND student_id = auth.uid() 
    AND status = 'submitted'
  );
$$;