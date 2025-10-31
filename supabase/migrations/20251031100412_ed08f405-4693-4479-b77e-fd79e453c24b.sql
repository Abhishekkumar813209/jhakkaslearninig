-- Set target_class to '13th' for dropper batches where not already set
UPDATE batches
SET target_class = '13th'::student_class
WHERE exam_type IN ('medical-ug', 'medical-pg', 'engineering')
  AND target_class IS NULL
  AND level ILIKE '%dropper%';