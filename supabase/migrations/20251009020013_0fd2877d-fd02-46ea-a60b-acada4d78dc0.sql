-- Update subject analytics trigger to populate exam_domain and student_class
CREATE OR REPLACE FUNCTION public.update_subject_analytics_after_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_subject TEXT;
  v_test_marks INTEGER;
  v_exam_domain TEXT;
  v_student_class TEXT;
BEGIN
  IF NEW.status IN ('submitted', 'auto_submitted') THEN
    -- Get test subject and student's exam info
    SELECT t.subject INTO v_subject
    FROM tests t
    WHERE t.id = NEW.test_id;
    
    SELECT p.exam_domain, p.student_class::TEXT INTO v_exam_domain, v_student_class
    FROM profiles p
    WHERE p.id = NEW.student_id;
    
    -- Insert or update subject analytics with domain awareness
    INSERT INTO subject_analytics (
      student_id,
      subject,
      exam_domain,
      student_class,
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
      v_exam_domain,
      v_student_class,
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
      exam_domain = v_exam_domain,
      student_class = v_student_class,
      updated_at = NOW();
    
    -- Update mastery level
    UPDATE subject_analytics sa
    SET mastery_level = CASE
      WHEN sa.average_score >= 90 AND sa.tests_taken >= 5 THEN 'master'
      WHEN sa.average_score >= 75 AND sa.tests_taken >= 3 THEN 'advanced'
      WHEN sa.average_score >= 60 AND sa.tests_taken >= 2 THEN 'intermediate'
      ELSE 'beginner'
    END
    WHERE sa.student_id = NEW.student_id AND sa.subject = v_subject;
    
    -- Subject rankings based on domain and class
    WITH subject_rankings AS (
      SELECT 
        sa.student_id,
        sa.subject,
        ROW_NUMBER() OVER (
          PARTITION BY sa.subject, sa.exam_domain, sa.student_class 
          ORDER BY sa.average_score DESC, sa.tests_taken DESC
        ) as rank,
        COUNT(*) OVER (PARTITION BY sa.subject, sa.exam_domain, sa.student_class) as total_students
      FROM subject_analytics sa
      WHERE sa.subject = v_subject 
        AND sa.exam_domain = v_exam_domain 
        AND sa.student_class = v_student_class
        AND sa.average_score > 0
    )
    UPDATE subject_analytics sa
    SET 
      subject_rank = sr.rank,
      subject_percentile = ROUND(((sr.total_students - sr.rank + 1) * 100.0 / sr.total_students), 2)
    FROM subject_rankings sr
    WHERE sa.student_id = sr.student_id AND sa.subject = sr.subject;
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update gamification trigger to populate exam_domain
CREATE OR REPLACE FUNCTION public.create_student_gamification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_exam_domain TEXT;
  v_student_class TEXT;
BEGIN
  SELECT exam_domain, student_class::TEXT INTO v_exam_domain, v_student_class
  FROM profiles
  WHERE id = NEW.id;
  
  INSERT INTO public.student_gamification (student_id, exam_domain, student_class)
  VALUES (NEW.id, v_exam_domain, v_student_class)
  ON CONFLICT (student_id) DO UPDATE SET
    exam_domain = v_exam_domain,
    student_class = v_student_class;
  
  RETURN NEW;
END;
$function$;