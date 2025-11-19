-- Remove CHECK constraint first (depends on exam_relevance)
ALTER TABLE chapter_library 
DROP CONSTRAINT IF EXISTS chapter_library_exam_relevance_check;

-- Drop unused columns
ALTER TABLE chapter_library 
DROP COLUMN IF EXISTS exam_relevance,
DROP COLUMN IF EXISTS difficulty,
DROP COLUMN IF EXISTS importance_score,
DROP COLUMN IF EXISTS can_skip,
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS is_custom,
DROP COLUMN IF EXISTS topics_strategy,
DROP COLUMN IF EXISTS topics;

-- Add comment for clarity
COMMENT ON TABLE chapter_library IS 'Centralized chapter library with minimal essential fields only';