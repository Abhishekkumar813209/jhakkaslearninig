-- Step 1: Add exam_name column to analytics tables
ALTER TABLE public.subject_analytics ADD COLUMN IF NOT EXISTS exam_name TEXT;
ALTER TABLE public.student_gamification ADD COLUMN IF NOT EXISTS exam_name TEXT;
ALTER TABLE public.student_leagues ADD COLUMN IF NOT EXISTS exam_name TEXT;

-- Backfill exam_name from profiles.target_exam
UPDATE public.subject_analytics sa
SET exam_name = p.target_exam
FROM public.profiles p
WHERE sa.student_id = p.id AND sa.exam_name IS NULL;

UPDATE public.student_gamification sg
SET exam_name = p.target_exam
FROM public.profiles p
WHERE sg.student_id = p.id AND sg.exam_name IS NULL;

UPDATE public.student_leagues sl
SET exam_name = p.target_exam
FROM public.profiles p
WHERE sl.student_id = p.id AND sl.exam_name IS NULL;

-- Update indexes for subject_analytics
DROP INDEX IF EXISTS idx_subject_analytics_subject_domain_class;
CREATE INDEX idx_subject_analytics_domain_exam_class ON public.subject_analytics(subject, exam_domain, exam_name, student_class, average_score DESC);

-- Update indexes for student_gamification
DROP INDEX IF EXISTS idx_student_gamification_domain_class;
CREATE INDEX idx_student_gamification_domain_exam_class ON public.student_gamification(exam_domain, exam_name, student_class, total_xp DESC);

-- Step 2: Update update_subject_analytics_after_test() trigger
CREATE OR REPLACE FUNCTION public.update_subject_analytics_after_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_subject TEXT;
  v_exam_domain TEXT;
  v_student_class TEXT;
  v_exam_name TEXT;
BEGIN
  IF NEW.status IN ('submitted', 'auto_submitted') THEN
    -- Get test subject and student's exam info
    SELECT t.subject INTO v_subject
    FROM tests t
    WHERE t.id = NEW.test_id;
    
    SELECT p.exam_domain, p.student_class::TEXT, p.target_exam 
    INTO v_exam_domain, v_student_class, v_exam_name
    FROM profiles p
    WHERE p.id = NEW.student_id;
    
    -- Insert or update subject analytics with domain and exam_name awareness
    INSERT INTO subject_analytics (
      student_id,
      subject,
      exam_domain,
      student_class,
      exam_name,
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
      v_exam_name,
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
      exam_name = v_exam_name,
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
    
    -- Subject rankings based on domain, exam_name, and class
    WITH subject_rankings AS (
      SELECT 
        sa.student_id,
        sa.subject,
        ROW_NUMBER() OVER (
          PARTITION BY sa.subject, sa.exam_domain, sa.exam_name, sa.student_class 
          ORDER BY sa.average_score DESC, sa.tests_taken DESC
        ) as rank,
        COUNT(*) OVER (PARTITION BY sa.subject, sa.exam_domain, sa.exam_name, sa.student_class) as total_students
      FROM subject_analytics sa
      WHERE sa.subject = v_subject 
        AND sa.exam_domain = v_exam_domain
        AND sa.exam_name = v_exam_name
        AND (sa.student_class = v_student_class OR (sa.student_class IS NULL AND v_student_class IS NULL))
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

-- Update create_student_gamification() trigger
CREATE OR REPLACE FUNCTION public.create_student_gamification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_exam_domain TEXT;
  v_student_class TEXT;
  v_exam_name TEXT;
BEGIN
  SELECT exam_domain, student_class::TEXT, target_exam 
  INTO v_exam_domain, v_student_class, v_exam_name
  FROM profiles
  WHERE id = NEW.id;
  
  INSERT INTO public.student_gamification (student_id, exam_domain, student_class, exam_name)
  VALUES (NEW.id, v_exam_domain, v_student_class, v_exam_name)
  ON CONFLICT (student_id) DO UPDATE SET
    exam_domain = v_exam_domain,
    student_class = v_student_class,
    exam_name = v_exam_name;
  
  RETURN NEW;
END;
$function$;

-- Update calculate_zone_rankings() to partition by exam_domain + exam_name + student_class
CREATE OR REPLACE FUNCTION public.calculate_zone_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Zone rankings (exam_domain + exam_name + class-wise, ordered by average_score)
  WITH zone_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.zone_id, p.exam_domain, 
          COALESCE(p.target_exam, 'default'), 
          COALESCE(p.student_class::TEXT, 'none')
        ORDER BY sa.average_score DESC, sa.tests_attempted DESC
      ) as zone_rank,
      COUNT(*) OVER (
        PARTITION BY p.zone_id, p.exam_domain, 
          COALESCE(p.target_exam, 'default'), 
          COALESCE(p.student_class::TEXT, 'none')
      ) as zone_total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.zone_id IS NOT NULL 
      AND p.exam_domain IS NOT NULL
      AND sa.average_score > 0
  )
  UPDATE public.student_analytics sa
  SET 
    zone_rank = zr.zone_rank,
    zone_percentile = ROUND(((zr.zone_total_students - zr.zone_rank + 1) * 100.0 / zr.zone_total_students), 2)
  FROM zone_rankings zr
  WHERE sa.student_id = zr.student_id;

  -- School rankings (exam_domain + exam_name + class-wise, ordered by average_score)
  WITH school_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.school_id, p.exam_domain, 
          COALESCE(p.target_exam, 'default'), 
          COALESCE(p.student_class::TEXT, 'none')
        ORDER BY sa.average_score DESC, sa.tests_attempted DESC
      ) as school_rank,
      COUNT(*) OVER (
        PARTITION BY p.school_id, p.exam_domain, 
          COALESCE(p.target_exam, 'default'), 
          COALESCE(p.student_class::TEXT, 'none')
      ) as school_total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.school_id IS NOT NULL 
      AND p.exam_domain IS NOT NULL
      AND sa.average_score > 0
  )
  UPDATE public.student_analytics sa
  SET 
    school_rank = sr.school_rank,
    school_percentile = ROUND(((sr.school_total_students - sr.school_rank + 1) * 100.0 / sr.school_total_students), 2)
  FROM school_rankings sr
  WHERE sa.student_id = sr.student_id;

  -- Overall rankings (exam_domain + exam_name + class-wise, ordered by average_score)
  WITH overall_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.exam_domain, 
          COALESCE(p.target_exam, 'default'), 
          COALESCE(p.student_class::TEXT, 'none')
        ORDER BY sa.average_score DESC, sa.tests_attempted DESC
      ) as overall_rank,
      COUNT(*) OVER (
        PARTITION BY p.exam_domain, 
          COALESCE(p.target_exam, 'default'), 
          COALESCE(p.student_class::TEXT, 'none')
      ) as total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.exam_domain IS NOT NULL
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