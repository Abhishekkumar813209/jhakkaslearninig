-- Create function to calculate and update test total marks
CREATE OR REPLACE FUNCTION update_test_total_marks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_marks INTEGER;
BEGIN
  -- Calculate total marks from all questions for the test
  SELECT COALESCE(SUM(marks), 0)
  INTO v_total_marks
  FROM questions
  WHERE test_id = COALESCE(NEW.test_id, OLD.test_id);
  
  -- Update the test's total_marks
  UPDATE tests
  SET total_marks = v_total_marks,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.test_id, OLD.test_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for INSERT on questions
CREATE TRIGGER trigger_update_test_marks_on_insert
AFTER INSERT ON questions
FOR EACH ROW
EXECUTE FUNCTION update_test_total_marks();

-- Create trigger for UPDATE on questions
CREATE TRIGGER trigger_update_test_marks_on_update
AFTER UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION update_test_total_marks();

-- Create trigger for DELETE on questions
CREATE TRIGGER trigger_update_test_marks_on_delete
AFTER DELETE ON questions
FOR EACH ROW
EXECUTE FUNCTION update_test_total_marks();

-- Update existing tests to calculate their current total marks
UPDATE tests t
SET total_marks = COALESCE(
  (SELECT SUM(marks) FROM questions WHERE test_id = t.id),
  0
),
updated_at = NOW()
WHERE EXISTS (SELECT 1 FROM questions WHERE test_id = t.id);