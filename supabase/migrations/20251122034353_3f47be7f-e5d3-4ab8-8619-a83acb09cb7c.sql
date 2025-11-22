-- Add explicit RLS policy for admins to browse centralized questions
-- This fixes the issue where CentralizedQuestionBrowser was blocked by RLS

CREATE POLICY "Admins can browse all centralized questions"
ON public.question_bank
FOR SELECT
TO authenticated
USING (
  -- Allow if user is admin (check user_roles table)
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::user_role
  )
);