-- Update total_marks for all tests based on the sum of question marks
UPDATE tests 
SET total_marks = COALESCE((
  SELECT SUM(marks) 
  FROM questions 
  WHERE questions.test_id = tests.id
), 0)
WHERE EXISTS (
  SELECT 1 FROM questions WHERE questions.test_id = tests.id
);

-- Update passing_marks to be reasonable (35% of total marks) for tests that have questions
UPDATE tests 
SET passing_marks = CASE 
  WHEN total_marks > 0 THEN GREATEST(1, ROUND(total_marks * 0.35))
  ELSE passing_marks
END
WHERE EXISTS (
  SELECT 1 FROM questions WHERE questions.test_id = tests.id
);