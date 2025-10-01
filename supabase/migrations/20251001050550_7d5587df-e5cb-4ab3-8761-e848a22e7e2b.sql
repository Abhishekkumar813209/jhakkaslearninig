-- Security Fix Part 2: Add search_path to remaining database functions

-- Fix update_student_streak function
CREATE OR REPLACE FUNCTION public.update_student_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

-- Fix update_battery_level function
CREATE OR REPLACE FUNCTION public.update_battery_level()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month integer := EXTRACT(month FROM CURRENT_DATE);
  current_year integer := EXTRACT(year FROM CURRENT_DATE);
  days_in_month integer := EXTRACT(days FROM DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day');
  current_day integer := EXTRACT(day FROM CURRENT_DATE);
  new_battery_level integer;
BEGIN
  new_battery_level := GREATEST(0, 100 - ((current_day - 1) * 100 / days_in_month));
  
  UPDATE public.fee_records 
  SET 
    battery_level = new_battery_level,
    updated_at = now()
  WHERE 
    month = current_month 
    AND year = current_year 
    AND is_paid = false;
END;
$$;

-- Fix generate_monthly_fees function
CREATE OR REPLACE FUNCTION public.generate_monthly_fees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_record RECORD;
  current_month integer := EXTRACT(month FROM CURRENT_DATE);
  current_year integer := EXTRACT(year FROM CURRENT_DATE);
  due_date_calc date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day';
BEGIN
  FOR student_record IN 
    SELECT p.id as student_id, p.batch_id
    FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE ur.role = 'student'::user_role
    AND NOT EXISTS (
      SELECT 1 FROM public.fee_records fr 
      WHERE fr.student_id = p.id 
      AND fr.month = current_month 
      AND fr.year = current_year
    )
  LOOP
    INSERT INTO public.fee_records (
      student_id, 
      batch_id, 
      amount, 
      month, 
      year, 
      due_date,
      battery_level
    ) VALUES (
      student_record.student_id,
      student_record.batch_id,
      5000,
      current_month,
      current_year,
      due_date_calc,
      100
    );
  END LOOP;
  
  RAISE NOTICE 'Generated fee records for month % year %', current_month, current_year;
END;
$$;

-- Fix calculate_zone_rankings function
CREATE OR REPLACE FUNCTION public.calculate_zone_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix update_student_analytics_after_test function
CREATE OR REPLACE FUNCTION public.update_student_analytics_after_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix calculate_performance_index function
CREATE OR REPLACE FUNCTION public.calculate_performance_index()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  FOR student_record IN 
    SELECT DISTINCT student_id FROM public.test_attempts 
    WHERE status IN ('submitted', 'auto_submitted')
  LOOP
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

-- Fix update_subject_analytics_after_test function
CREATE OR REPLACE FUNCTION public.update_subject_analytics_after_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    END,
    subject_performance_index = (sa.average_score * 0.6) + (sa.best_score * 0.3) + (LEAST(sa.tests_taken * 2, 20) * 0.5)
    WHERE sa.student_id = NEW.student_id AND sa.subject = v_subject;
    
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
$$;

-- Fix update_test_total_marks function
CREATE OR REPLACE FUNCTION public.update_test_total_marks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_marks INTEGER;
BEGIN
  SELECT COALESCE(SUM(marks), 0)
  INTO v_total_marks
  FROM questions
  WHERE test_id = COALESCE(NEW.test_id, OLD.test_id);
  
  UPDATE tests
  SET total_marks = v_total_marks,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.test_id, OLD.test_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix create_student_analytics function
CREATE OR REPLACE FUNCTION public.create_student_analytics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.student_analytics (student_id)
    VALUES (NEW.id)
    ON CONFLICT (student_id) DO NOTHING;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_student_streak IS 'Security: Updates student streak - uses search_path protection';
COMMENT ON FUNCTION public.update_battery_level IS 'Security: Updates battery level - uses SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.generate_monthly_fees IS 'Security: Generates monthly fees - uses SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.calculate_zone_rankings IS 'Security: Calculates zone rankings - uses SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.update_student_analytics_after_test IS 'Security: Updates analytics after test - uses SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.calculate_performance_index IS 'Security: Calculates performance index - uses SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.update_subject_analytics_after_test IS 'Security: Updates subject analytics - uses SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.update_test_total_marks IS 'Security: Updates test total marks - uses SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.update_updated_at_column IS 'Security: Updates timestamp - uses search_path protection';
COMMENT ON FUNCTION public.create_student_analytics IS 'Security: Creates student analytics - uses search_path protection';