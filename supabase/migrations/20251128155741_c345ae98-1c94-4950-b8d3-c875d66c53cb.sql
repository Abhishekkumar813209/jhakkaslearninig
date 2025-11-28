-- Add RLS policy for students to view questions for batch-assigned tests
CREATE POLICY "Students can view questions for batch-assigned tests"
ON questions FOR SELECT
USING (
  test_id IN (
    SELECT bt.central_test_id 
    FROM batch_tests bt
    JOIN profiles p ON p.batch_id = bt.batch_id
    WHERE p.id = auth.uid()
  )
);