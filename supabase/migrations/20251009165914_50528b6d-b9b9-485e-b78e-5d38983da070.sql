-- Phase 6 & 15: Game Completion XP and Difficulty-based XP System

-- Add game tracking columns to student_roadmap_progress
ALTER TABLE public.student_roadmap_progress
ADD COLUMN IF NOT EXISTS games_completed JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_games_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS games_completed_at TIMESTAMPTZ;

-- Add difficulty column to topic_content_mapping
ALTER TABLE public.topic_content_mapping
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium'
CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_student_progress_games 
ON public.student_roadmap_progress(student_id, games_completed);

-- Update existing gamified_exercises difficulty constraint if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gamified_exercises' 
    AND column_name = 'difficulty'
  ) THEN
    ALTER TABLE public.gamified_exercises 
    DROP CONSTRAINT IF EXISTS gamified_exercises_difficulty_check;
    
    ALTER TABLE public.gamified_exercises
    ADD CONSTRAINT gamified_exercises_difficulty_check 
    CHECK (difficulty IN ('easy', 'medium', 'hard'));
  END IF;
END $$;