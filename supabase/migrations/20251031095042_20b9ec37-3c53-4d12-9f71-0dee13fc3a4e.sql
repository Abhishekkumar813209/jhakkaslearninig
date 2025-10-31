-- Fix existing medical/engineering batches without target_class
-- Only update Class 11 and 12 (dropper batches need manual update)
UPDATE batches 
SET target_class = CASE
  WHEN level ILIKE '%11%' AND level NOT ILIKE '%dropper%' THEN '11'::student_class
  WHEN level ILIKE '%12%' AND level NOT ILIKE '%dropper%' THEN '12'::student_class
  ELSE NULL
END
WHERE exam_type IN ('medical-ug', 'medical-pg', 'engineering')
AND target_class IS NULL
AND level NOT ILIKE '%dropper%';

-- For dropper batches, we'll handle separately
-- Dropper batches will show up when no class filter is selected