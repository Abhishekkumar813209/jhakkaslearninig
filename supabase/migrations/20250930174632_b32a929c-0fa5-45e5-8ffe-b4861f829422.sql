-- Drop trigger first, then function
DROP TRIGGER IF EXISTS update_student_analytics_trigger ON test_attempts;
DROP TRIGGER IF EXISTS trigger_update_student_analytics ON test_attempts;
DROP FUNCTION IF EXISTS public.update_student_analytics_after_test() CASCADE;

-- Updated function to calculate analytics using BEST attempt per test only
CREATE OR REPLACE FUNCTION public.update_student_analytics_after_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_student_id UUID;
  v_total_tests INTEGER;
  v_avg_score NUMERIC;
BEGIN
  -- Only process when test is submitted (not in progress)
  IF NEW.status IN ('submitted', 'auto_submitted') THEN
    v_student_id := NEW.student_id;
    
    -- Calculate total UNIQUE tests attempted and average score
    -- Using MAX(percentage) per test to get BEST attempt only
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
    
    -- Recalculate all rankings (zone, school, overall) - CLASS WISE
    PERFORM calculate_zone_rankings();
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop and recreate ranking function with CLASS-WISE segregation
DROP FUNCTION IF EXISTS public.calculate_zone_rankings() CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_zone_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Calculate ZONE rankings (CLASS WISE within each zone)
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
  )
  UPDATE public.student_analytics sa
  SET 
    zone_rank = zr.zone_rank,
    zone_percentile = ROUND(((zr.zone_total_students - zr.zone_rank + 1) * 100.0 / zr.zone_total_students), 2)
  FROM zone_rankings zr
  WHERE sa.student_id = zr.student_id;

  -- Calculate SCHOOL rankings (CLASS WISE within each school)
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
  )
  UPDATE public.student_analytics sa
  SET 
    school_rank = sr.school_rank,
    school_percentile = ROUND(((sr.school_total_students - sr.school_rank + 1) * 100.0 / sr.school_total_students), 2)
  FROM school_rankings sr
  WHERE sa.student_id = sr.student_id;

  -- Calculate OVERALL rankings (CLASS WISE across all zones)
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
  )
  UPDATE public.student_analytics sa
  SET 
    overall_rank = ov.overall_rank,
    overall_percentile = ROUND(((ov.total_students - ov.overall_rank + 1) * 100.0 / ov.total_students), 2)
  FROM overall_rankings ov
  WHERE sa.student_id = ov.student_id;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER trigger_update_student_analytics
  AFTER INSERT OR UPDATE ON test_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_student_analytics_after_test();