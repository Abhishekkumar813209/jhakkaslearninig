-- Phase 1: Make topics nullable in chapter_library to support fetching chapters without topics
ALTER TABLE chapter_library 
ALTER COLUMN topics DROP NOT NULL;

-- Add a flag to track if topics have been generated
ALTER TABLE chapter_library 
ADD COLUMN IF NOT EXISTS topics_generated BOOLEAN DEFAULT false;

COMMENT ON COLUMN chapter_library.topics_generated IS 'Indicates whether topics have been generated for this chapter';