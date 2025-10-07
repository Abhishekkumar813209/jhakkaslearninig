-- Add importance metadata columns to chapter_library table
ALTER TABLE chapter_library 
ADD COLUMN IF NOT EXISTS importance_score INTEGER CHECK (importance_score >= 1 AND importance_score <= 10),
ADD COLUMN IF NOT EXISTS exam_relevance TEXT CHECK (exam_relevance IN ('core', 'important', 'optional')),
ADD COLUMN IF NOT EXISTS can_skip BOOLEAN DEFAULT false;

-- Add index for filtering by importance
CREATE INDEX IF NOT EXISTS idx_chapter_library_importance ON chapter_library(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_chapter_library_exam_relevance ON chapter_library(exam_relevance);