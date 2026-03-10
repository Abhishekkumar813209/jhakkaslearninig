CREATE POLICY "Parents can view linked student profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT psl.student_id 
    FROM public.parent_student_links psl 
    WHERE psl.parent_id = auth.uid()
  )
);