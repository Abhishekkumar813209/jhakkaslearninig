-- Add student_class and board columns to exam_templates for better caching
ALTER TABLE exam_templates
ADD COLUMN IF NOT EXISTS student_class TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS board TEXT DEFAULT '';

-- Create composite unique index for better cache lookups
DROP INDEX IF EXISTS exam_templates_unique_key;
CREATE UNIQUE INDEX exam_templates_unique_key 
ON exam_templates(exam_type, exam_name, student_class, board) 
WHERE is_active = true;