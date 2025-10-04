-- Add subject_order column to student_roadmaps for drag-and-drop functionality
ALTER TABLE student_roadmaps 
ADD COLUMN IF NOT EXISTS subject_order JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN student_roadmaps.subject_order IS 'Student-customized subject priority order as JSON array of subject names';