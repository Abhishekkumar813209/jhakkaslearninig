-- Add class_level column to chapter_library table
ALTER TABLE chapter_library 
ADD COLUMN IF NOT EXISTS class_level TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_chapter_library_class_level 
ON chapter_library(class_level);

-- Update existing records to have NULL class_level (competitive exams don't need it)
UPDATE chapter_library 
SET class_level = NULL 
WHERE class_level IS NULL AND exam_type NOT IN ('school', 'board');