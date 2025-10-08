-- Fix existing school batches with NULL target_board
-- Set target_board = exam_name for proper filtering
UPDATE batches 
SET target_board = CAST(exam_name AS education_board)
WHERE exam_type = 'school' 
  AND target_board IS NULL 
  AND exam_name IS NOT NULL;