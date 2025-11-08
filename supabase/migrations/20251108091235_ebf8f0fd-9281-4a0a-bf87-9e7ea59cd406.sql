-- Drop the unique constraint that prevents multiple games of the same type per topic
-- This allows multiple True/False, MCQ, or other game types to exist for the same topic_content_id
DROP INDEX IF EXISTS idx_gamified_exercises_unique_per_content;