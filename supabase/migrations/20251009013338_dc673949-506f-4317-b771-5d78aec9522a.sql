-- Drop and recreate calculate_zone_rankings function with exam_domain awareness
DROP FUNCTION IF EXISTS public.calculate_zone_rankings();

CREATE OR REPLACE FUNCTION public.calculate_zone_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Zone rankings (class-wise + exam_domain-wise, ordered by average_score)
  WITH zone_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.zone_id, p.student_class, p.exam_domain
        ORDER BY sa.average_score DESC, sa.tests_attempted DESC
      ) as zone_rank,
      COUNT(*) OVER (
        PARTITION BY p.zone_id, p.student_class, p.exam_domain
      ) as zone_total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.zone_id IS NOT NULL 
      AND p.student_class IS NOT NULL
      AND p.exam_domain IS NOT NULL
      AND sa.average_score > 0
  )
  UPDATE public.student_analytics sa
  SET 
    zone_rank = zr.zone_rank,
    zone_percentile = ROUND(((zr.zone_total_students - zr.zone_rank + 1) * 100.0 / zr.zone_total_students), 2)
  FROM zone_rankings zr
  WHERE sa.student_id = zr.student_id;

  -- School rankings (class-wise + exam_domain-wise, ordered by average_score)
  WITH school_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.school_id, p.student_class, p.exam_domain
        ORDER BY sa.average_score DESC, sa.tests_attempted DESC
      ) as school_rank,
      COUNT(*) OVER (
        PARTITION BY p.school_id, p.student_class, p.exam_domain
      ) as school_total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.school_id IS NOT NULL 
      AND p.student_class IS NOT NULL
      AND p.exam_domain IS NOT NULL
      AND sa.average_score > 0
  )
  UPDATE public.student_analytics sa
  SET 
    school_rank = sr.school_rank,
    school_percentile = ROUND(((sr.school_total_students - sr.school_rank + 1) * 100.0 / sr.school_total_students), 2)
  FROM school_rankings sr
  WHERE sa.student_id = sr.student_id;

  -- Overall rankings (class-wise + exam_domain-wise, ordered by average_score)
  WITH overall_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.student_class, p.exam_domain
        ORDER BY sa.average_score DESC, sa.tests_attempted DESC
      ) as overall_rank,
      COUNT(*) OVER (
        PARTITION BY p.student_class, p.exam_domain
      ) as total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.student_class IS NOT NULL
      AND p.exam_domain IS NOT NULL
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