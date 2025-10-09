-- Phase 12: Remove Performance Index System and Simplify Rankings

-- Drop the complex performance index calculation function
DROP FUNCTION IF EXISTS public.calculate_performance_index();

-- Update calculate_zone_rankings to use average_score instead of performance_index
CREATE OR REPLACE FUNCTION public.calculate_zone_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Zone rankings (class-wise, ordered by average_score)
  WITH zone_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.zone_id, p.student_class 
        ORDER BY sa.average_score DESC, sa.tests_attempted DESC
      ) as zone_rank,
      COUNT(*) OVER (
        PARTITION BY p.zone_id, p.student_class
      ) as zone_total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.zone_id IS NOT NULL 
      AND p.student_class IS NOT NULL
      AND sa.average_score > 0
  )
  UPDATE public.student_analytics sa
  SET 
    zone_rank = zr.zone_rank,
    zone_percentile = ROUND(((zr.zone_total_students - zr.zone_rank + 1) * 100.0 / zr.zone_total_students), 2)
  FROM zone_rankings zr
  WHERE sa.student_id = zr.student_id;

  -- School rankings (class-wise, ordered by average_score)
  WITH school_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.school_id, p.student_class 
        ORDER BY sa.average_score DESC, sa.tests_attempted DESC
      ) as school_rank,
      COUNT(*) OVER (
        PARTITION BY p.school_id, p.student_class
      ) as school_total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.school_id IS NOT NULL 
      AND p.student_class IS NOT NULL
      AND sa.average_score > 0
  )
  UPDATE public.student_analytics sa
  SET 
    school_rank = sr.school_rank,
    school_percentile = ROUND(((sr.school_total_students - sr.school_rank + 1) * 100.0 / sr.school_total_students), 2)
  FROM school_rankings sr
  WHERE sa.student_id = sr.student_id;

  -- Overall rankings (class-wise, ordered by average_score)
  WITH overall_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.student_class
        ORDER BY sa.average_score DESC, sa.tests_attempted DESC
      ) as overall_rank,
      COUNT(*) OVER (
        PARTITION BY p.student_class
      ) as total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.student_class IS NOT NULL
      AND sa.average_score > 0
  )
  UPDATE public.student_analytics sa
  SET 
    overall_rank = ov.overall_rank,
    overall_percentile = ROUND(((ov.total_students - ov.overall_rank + 1) * 100.0 / ov.total_students), 2)
  FROM overall_rankings ov
  WHERE sa.student_id = ov.student_id;
END;
$function$;

-- Update the trigger function to remove call to calculate_performance_index
CREATE OR REPLACE FUNCTION public.update_student_analytics_after_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_student_id UUID;
  v_total_tests INTEGER;
  v_avg_score NUMERIC;
BEGIN
  IF NEW.status IN ('submitted', 'auto_submitted') THEN
    v_student_id := NEW.student_id;
    
    SELECT 
      COUNT(DISTINCT test_id),
      AVG(best_percentage)
    INTO v_total_tests, v_avg_score
    FROM (
      SELECT 
        test_id,
        MAX(percentage) as best_percentage
      FROM test_attempts
      WHERE student_id = v_student_id
        AND status IN ('submitted', 'auto_submitted')
      GROUP BY test_id
    ) best_attempts;
    
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
    
    PERFORM calculate_zone_rankings();
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update subject analytics function to remove subject_performance_index
CREATE OR REPLACE FUNCTION public.update_subject_analytics_after_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_subject TEXT;
  v_test_marks INTEGER;
BEGIN
  IF NEW.status IN ('submitted', 'auto_submitted') THEN
    SELECT t.subject, t.total_marks INTO v_subject, v_test_marks
    FROM tests t
    WHERE t.id = NEW.test_id;
    
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
    
    UPDATE subject_analytics sa
    SET mastery_level = CASE
      WHEN sa.average_score >= 90 AND sa.tests_taken >= 5 THEN 'master'
      WHEN sa.average_score >= 75 AND sa.tests_taken >= 3 THEN 'advanced'
      WHEN sa.average_score >= 60 AND sa.tests_taken >= 2 THEN 'intermediate'
      ELSE 'beginner'
    END
    WHERE sa.student_id = NEW.student_id AND sa.subject = v_subject;
    
    -- Subject rankings based on average_score
    WITH subject_rankings AS (
      SELECT 
        sa.student_id,
        sa.subject,
        ROW_NUMBER() OVER (PARTITION BY sa.subject ORDER BY sa.average_score DESC, sa.tests_taken DESC) as rank,
        COUNT(*) OVER (PARTITION BY sa.subject) as total_students
      FROM subject_analytics sa
      WHERE sa.subject = v_subject AND sa.average_score > 0
    )
    UPDATE subject_analytics sa
    SET 
      subject_rank = sr.rank,
      subject_percentile = ROUND(((sr.total_students - sr.rank + 1) * 100.0 / sr.total_students), 2)
    FROM subject_rankings sr
    WHERE sa.student_id = sr.student_id AND sa.subject = sr.subject;
    
    IF NEW.percentage = 100 THEN
      INSERT INTO achievements (student_id, achievement_type, test_id, score, metadata)
      VALUES (NEW.student_id, 'perfect_scorer', NEW.test_id, NEW.score, jsonb_build_object('subject', v_subject))
      ON CONFLICT DO NOTHING;
    END IF;
    
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
$function$;

-- Drop performance index columns from student_analytics
ALTER TABLE public.student_analytics 
DROP COLUMN IF EXISTS performance_index,
DROP COLUMN IF EXISTS base_score,
DROP COLUMN IF EXISTS speed_bonus,
DROP COLUMN IF EXISTS consistency_factor,
DROP COLUMN IF EXISTS recency_factor;

-- Drop subject_performance_index from subject_analytics
ALTER TABLE public.subject_analytics
DROP COLUMN IF EXISTS subject_performance_index;