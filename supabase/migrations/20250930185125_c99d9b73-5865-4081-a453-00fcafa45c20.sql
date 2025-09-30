-- Fix ambiguous column references in update_subject_analytics_after_test function
DROP FUNCTION IF EXISTS update_subject_analytics_after_test() CASCADE;

CREATE OR REPLACE FUNCTION public.update_subject_analytics_after_test()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_subject TEXT;
  v_test_marks INTEGER;
BEGIN
  IF NEW.status IN ('submitted', 'auto_submitted') THEN
    -- Get test subject and marks - qualify column names with table alias
    SELECT t.subject, t.total_marks INTO v_subject, v_test_marks
    FROM tests t
    WHERE t.id = NEW.test_id;
    
    -- Update subject analytics with proper table qualifications
    INSERT INTO subject_analytics (
      student_id,
      subject,
      tests_taken,
      average_score,
      best_score,
      total_marks_obtained,
      total_marks_possible,
      last_test_date
    )
    SELECT
      NEW.student_id,
      v_subject,
      COUNT(*),
      AVG(ta.percentage),
      MAX(ta.percentage),
      SUM(ta.score),
      SUM(ta.total_marks),
      MAX(ta.submitted_at)
    FROM test_attempts ta
    JOIN tests t ON ta.test_id = t.id
    WHERE ta.student_id = NEW.student_id
      AND t.subject = v_subject
      AND ta.status IN ('submitted', 'auto_submitted')
    ON CONFLICT (student_id, subject) DO UPDATE SET
      tests_taken = EXCLUDED.tests_taken,
      average_score = EXCLUDED.average_score,
      best_score = EXCLUDED.best_score,
      total_marks_obtained = EXCLUDED.total_marks_obtained,
      total_marks_possible = EXCLUDED.total_marks_possible,
      last_test_date = EXCLUDED.last_test_date,
      updated_at = NOW();
    
    -- Update mastery level based on performance
    UPDATE subject_analytics sa
    SET mastery_level = CASE
      WHEN sa.average_score >= 90 AND sa.tests_taken >= 5 THEN 'master'
      WHEN sa.average_score >= 75 AND sa.tests_taken >= 3 THEN 'advanced'
      WHEN sa.average_score >= 60 AND sa.tests_taken >= 2 THEN 'intermediate'
      ELSE 'beginner'
    END,
    subject_performance_index = (sa.average_score * 0.6) + (sa.best_score * 0.3) + (LEAST(sa.tests_taken * 2, 20) * 0.5)
    WHERE sa.student_id = NEW.student_id AND sa.subject = v_subject;
    
    -- Calculate subject rankings with proper qualifications
    WITH subject_rankings AS (
      SELECT 
        sa.student_id,
        sa.subject,
        ROW_NUMBER() OVER (PARTITION BY sa.subject ORDER BY sa.subject_performance_index DESC) as rank,
        COUNT(*) OVER (PARTITION BY sa.subject) as total_students
      FROM subject_analytics sa
      WHERE sa.subject = v_subject
    )
    UPDATE subject_analytics sa
    SET 
      subject_rank = sr.rank,
      subject_percentile = ROUND(((sr.total_students - sr.rank + 1) * 100.0 / sr.total_students), 2)
    FROM subject_rankings sr
    WHERE sa.student_id = sr.student_id AND sa.subject = sr.subject;
    
    -- Check for achievements
    -- Perfect Scorer
    IF NEW.percentage = 100 THEN
      INSERT INTO achievements (student_id, achievement_type, test_id, score, metadata)
      VALUES (NEW.student_id, 'perfect_scorer', NEW.test_id, NEW.score, jsonb_build_object('subject', v_subject))
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Speed Demon (completed in less than 50% of allotted time with >80% score)
    IF NEW.percentage >= 80 AND EXISTS (
      SELECT 1 FROM tests t
      WHERE t.id = NEW.test_id
      AND NEW.time_taken_minutes < (t.duration_minutes * 0.5)
    ) THEN
      INSERT INTO achievements (student_id, achievement_type, test_id, score, metadata)
      VALUES (NEW.student_id, 'speed_demon', NEW.test_id, NEW.score, 
              jsonb_build_object('subject', v_subject, 'time_taken', NEW.time_taken_minutes))
      ON CONFLICT DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_update_subject_analytics
AFTER INSERT OR UPDATE ON test_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_subject_analytics_after_test();