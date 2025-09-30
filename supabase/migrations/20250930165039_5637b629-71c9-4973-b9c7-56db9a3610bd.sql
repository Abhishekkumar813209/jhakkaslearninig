-- Function to update student analytics after test submission
CREATE OR REPLACE FUNCTION update_student_analytics_after_test()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id UUID;
  v_total_tests INTEGER;
  v_avg_score NUMERIC;
BEGIN
  -- Only process when test is submitted (not in progress)
  IF NEW.status IN ('submitted', 'auto_submitted') THEN
    v_student_id := NEW.student_id;
    
    -- Calculate total tests attempted and average score
    SELECT 
      COUNT(*),
      AVG(percentage)
    INTO v_total_tests, v_avg_score
    FROM test_attempts
    WHERE student_id = v_student_id
      AND status IN ('submitted', 'auto_submitted');
    
    -- Update or insert student analytics
    INSERT INTO student_analytics (
      student_id,
      tests_attempted,
      average_score,
      last_active_date,
      updated_at
    ) VALUES (
      v_student_id,
      v_total_tests,
      COALESCE(v_avg_score, 0),
      CURRENT_DATE,
      NOW()
    )
    ON CONFLICT (student_id) DO UPDATE SET
      tests_attempted = v_total_tests,
      average_score = COALESCE(v_avg_score, 0),
      last_active_date = CURRENT_DATE,
      updated_at = NOW();
    
    -- Recalculate all rankings (zone, school, overall)
    PERFORM calculate_zone_rankings();
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_student_analytics ON test_attempts;

-- Create trigger on test_attempts table
CREATE TRIGGER trigger_update_student_analytics
AFTER INSERT OR UPDATE ON test_attempts
FOR EACH ROW
WHEN (NEW.status IN ('submitted', 'auto_submitted'))
EXECUTE FUNCTION update_student_analytics_after_test();

-- Also update streak when student is active
CREATE OR REPLACE FUNCTION update_student_streak()
RETURNS TRIGGER AS $$
BEGIN
  -- Update streak logic
  UPDATE student_analytics
  SET 
    streak_days = CASE
      WHEN last_active_date = CURRENT_DATE - INTERVAL '1 day' THEN streak_days + 1
      WHEN last_active_date < CURRENT_DATE - INTERVAL '1 day' THEN 1
      ELSE streak_days
    END,
    last_active_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE student_id = NEW.student_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_streak ON test_attempts;

CREATE TRIGGER trigger_update_streak
AFTER INSERT ON test_attempts
FOR EACH ROW
EXECUTE FUNCTION update_student_streak();