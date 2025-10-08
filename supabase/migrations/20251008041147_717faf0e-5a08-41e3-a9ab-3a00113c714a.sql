-- Clean up existing school batches with NULL target_board
-- Set target_board from exam_name where possible
UPDATE batches
SET target_board = CAST(exam_name AS education_board),
    updated_at = NOW()
WHERE exam_type = 'school'
  AND target_board IS NULL
  AND exam_name IS NOT NULL
  AND exam_name != '';

-- Clean up exam_name to match target_board for school batches
UPDATE batches
SET exam_name = target_board::text,
    updated_at = NOW()
WHERE exam_type = 'school'
  AND target_board IS NOT NULL
  AND (exam_name IS NULL OR exam_name = '' OR exam_name != target_board::text);