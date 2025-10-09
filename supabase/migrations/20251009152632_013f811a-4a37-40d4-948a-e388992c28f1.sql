-- Step 5.1: Add exam_name column to student_analytics (no exam_domain needed here)
ALTER TABLE student_analytics 
ADD COLUMN IF NOT EXISTS exam_name TEXT;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_student_analytics_exam_name 
ON student_analytics(exam_name);

-- Step 5.2: Backfill exam_name in student_gamification
UPDATE student_gamification sg
SET exam_name = p.target_exam
FROM profiles p
WHERE sg.student_id = p.id
  AND sg.exam_name IS NULL
  AND p.target_exam IS NOT NULL;

-- Backfill exam_name in student_analytics
UPDATE student_analytics sa
SET exam_name = p.target_exam
FROM profiles p
WHERE sa.student_id = p.id
  AND (sa.exam_name IS NULL OR sa.exam_name != p.target_exam)
  AND p.target_exam IS NOT NULL;

-- Backfill exam_name in subject_analytics
UPDATE subject_analytics sa
SET exam_name = p.target_exam
FROM profiles p
WHERE sa.student_id = p.id
  AND (sa.exam_name IS NULL OR sa.exam_name != p.target_exam)
  AND p.target_exam IS NOT NULL;

-- Backfill exam_name in student_leagues
UPDATE student_leagues sl
SET exam_name = p.target_exam
FROM profiles p
WHERE sl.student_id = p.id
  AND (sl.exam_name IS NULL OR sl.exam_name != p.target_exam)
  AND p.target_exam IS NOT NULL;

-- Step 5.3: Fix data inconsistencies - sync exam_domain and student_class in student_gamification
UPDATE student_gamification sg
SET exam_domain = p.exam_domain,
    student_class = p.student_class::TEXT
FROM profiles p
WHERE sg.student_id = p.id
  AND (sg.exam_domain IS DISTINCT FROM p.exam_domain OR sg.student_class IS DISTINCT FROM p.student_class::TEXT);

-- Step 5.4: Update calculate_zone_rankings() function with composite filtering (exam_domain, exam_name, student_class)
CREATE OR REPLACE FUNCTION public.calculate_zone_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;