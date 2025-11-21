-- Add display_order column to chapter_library
ALTER TABLE chapter_library 
ADD COLUMN display_order INTEGER;

-- Set initial display_order based on current alphabetical order per subject
WITH ranked AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY exam_type, subject, class_level 
      ORDER BY chapter_name
    ) as row_num
  FROM chapter_library
  WHERE is_active = true
)
UPDATE chapter_library
SET display_order = ranked.row_num
FROM ranked
WHERE chapter_library.id = ranked.id;

-- Set default for new chapters
ALTER TABLE chapter_library 
ALTER COLUMN display_order SET DEFAULT 999;