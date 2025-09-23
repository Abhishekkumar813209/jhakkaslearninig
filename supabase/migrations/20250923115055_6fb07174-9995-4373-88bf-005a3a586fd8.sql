-- Add policy to allow students to view questions of published tests for their class/board
CREATE POLICY "Students can view questions of published tests for their class"
ON public.questions
FOR SELECT
USING (
  test_id IN (
    SELECT t.id 
    FROM tests t
    JOIN profiles p ON p.id = auth.uid()
    WHERE t.is_published = true 
    AND t.target_class = p.student_class 
    AND t.target_board = p.education_board
  )
);