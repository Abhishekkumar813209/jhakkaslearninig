-- Fix search_path for new Performance Index functions
CREATE OR REPLACE FUNCTION public.calculate_performance_index()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  student_record RECORD;
  v_base_score NUMERIC;
  v_speed_bonus NUMERIC;
  v_consistency_factor NUMERIC;
  v_recency_factor NUMERIC;
  v_performance_index NUMERIC;
  v_std_dev NUMERIC;
  v_recent_avg NUMERIC;
  v_historical_avg NUMERIC;
BEGIN
  -- Loop through all students
  FOR student_record IN 
    SELECT DISTINCT student_id FROM public.test_attempts 
    WHERE status IN ('submitted', 'auto_submitted')
  LOOP
    -- 1. Calculate BASE SCORE (best attempt per test, weighted by difficulty)
    SELECT 
      COALESCE(AVG(
        CASE t.difficulty
          WHEN 'easy' THEN best.best_percentage * 0.8
          WHEN 'medium' THEN best.best_percentage * 1.0
          WHEN 'hard' THEN best.best_percentage * 1.2
          ELSE best.best_percentage
        END
      ), 0)
    INTO v_base_score
    FROM (
      SELECT 
        ta.test_id,
        MAX(ta.percentage) as best_percentage
      FROM test_attempts ta
      WHERE ta.student_id = student_record.student_id
        AND ta.status IN ('submitted', 'auto_submitted')
      GROUP BY ta.test_id
    ) best
    JOIN tests t ON best.test_id = t.id;

    -- 2. Calculate SPEED BONUS (avg speed efficiency)
    SELECT 
      COALESCE(AVG(
        LEAST(1.2, 
          CASE 
            WHEN ta.time_taken_minutes > 0 THEN 
              (t.duration_minutes::NUMERIC / ta.time_taken_minutes)
            ELSE 1.0
          END
        )
      ), 1.0)
    INTO v_speed_bonus
    FROM test_attempts ta
    JOIN tests t ON ta.test_id = t.id
    WHERE ta.student_id = student_record.student_id
      AND ta.status IN ('submitted', 'auto_submitted')
      AND ta.percentage >= 50;

    -- 3. Calculate CONSISTENCY FACTOR (based on std deviation)
    SELECT 
      COALESCE(STDDEV(best_percentage), 0)
    INTO v_std_dev
    FROM (
      SELECT 
        MAX(ta.percentage) as best_percentage
      FROM test_attempts ta
      WHERE ta.student_id = student_record.student_id
        AND ta.status IN ('submitted', 'auto_submitted')
      GROUP BY ta.test_id
    ) best_attempts;

    v_consistency_factor := GREATEST(0, 1 - (v_std_dev / 100.0));

    -- 4. Calculate RECENCY FACTOR
    SELECT 
      COALESCE(AVG(best_percentage), 0)
    INTO v_recent_avg
    FROM (
      SELECT 
        ta.test_id,
        MAX(ta.percentage) as best_percentage
      FROM test_attempts ta
      WHERE ta.student_id = student_record.student_id
        AND ta.status IN ('submitted', 'auto_submitted')
        AND ta.submitted_at >= NOW() - INTERVAL '3 months'
      GROUP BY ta.test_id
    ) recent;

    SELECT 
      COALESCE(AVG(best_percentage), v_recent_avg)
    INTO v_historical_avg
    FROM (
      SELECT 
        ta.test_id,
        MAX(ta.percentage) as best_percentage
      FROM test_attempts ta
      WHERE ta.student_id = student_record.student_id
        AND ta.status IN ('submitted', 'auto_submitted')
        AND ta.submitted_at < NOW() - INTERVAL '3 months'
      GROUP BY ta.test_id
    ) historical;

    v_recency_factor := (v_recent_avg * 0.7) + (v_historical_avg * 0.3);

    -- 5. FINAL PERFORMANCE INDEX CALCULATION
    v_performance_index := (
      (v_base_score * 0.50) +
      (v_speed_bonus * 100 * 0.20) +
      (v_consistency_factor * 100 * 0.15) +
      (v_recency_factor * 0.15)
    );

    UPDATE public.student_analytics
    SET 
      performance_index = ROUND(v_performance_index, 2),
      base_score = ROUND(v_base_score, 2),
      speed_bonus = ROUND(v_speed_bonus, 3),
      consistency_factor = ROUND(v_consistency_factor, 3),
      recency_factor = ROUND(v_recency_factor, 2),
      updated_at = NOW()
    WHERE student_id = student_record.student_id;

  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_zone_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM calculate_performance_index();

  WITH zone_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.zone_id, p.student_class 
        ORDER BY sa.performance_index DESC, sa.tests_attempted DESC
      ) as zone_rank,
      COUNT(*) OVER (
        PARTITION BY p.zone_id, p.student_class
      ) as zone_total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.zone_id IS NOT NULL 
      AND p.student_class IS NOT NULL
      AND sa.performance_index > 0
  )
  UPDATE public.student_analytics sa
  SET 
    zone_rank = zr.zone_rank,
    zone_percentile = ROUND(((zr.zone_total_students - zr.zone_rank + 1) * 100.0 / zr.zone_total_students), 2)
  FROM zone_rankings zr
  WHERE sa.student_id = zr.student_id;

  WITH school_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.school_id, p.student_class 
        ORDER BY sa.performance_index DESC, sa.tests_attempted DESC
      ) as school_rank,
      COUNT(*) OVER (
        PARTITION BY p.school_id, p.student_class
      ) as school_total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.school_id IS NOT NULL 
      AND p.student_class IS NOT NULL
      AND sa.performance_index > 0
  )
  UPDATE public.student_analytics sa
  SET 
    school_rank = sr.school_rank,
    school_percentile = ROUND(((sr.school_total_students - sr.school_rank + 1) * 100.0 / sr.school_total_students), 2)
  FROM school_rankings sr
  WHERE sa.student_id = sr.student_id;

  WITH overall_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.student_class
        ORDER BY sa.performance_index DESC, sa.tests_attempted DESC
      ) as overall_rank,
      COUNT(*) OVER (
        PARTITION BY p.student_class
      ) as total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.student_class IS NOT NULL
      AND sa.performance_index > 0
  )
  UPDATE public.student_analytics sa
  SET 
    overall_rank = ov.overall_rank,
    overall_percentile = ROUND(((ov.total_students - ov.overall_rank + 1) * 100.0 / ov.total_students), 2)
  FROM overall_rankings ov
  WHERE sa.student_id = ov.student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_analytics_after_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;