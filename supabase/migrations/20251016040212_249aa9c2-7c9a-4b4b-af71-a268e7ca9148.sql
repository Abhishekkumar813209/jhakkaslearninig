-- Add game_order column to gamified_exercises for sequential ordering
ALTER TABLE public.gamified_exercises 
ADD COLUMN IF NOT EXISTS game_order INTEGER DEFAULT 0;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_games_topic_order 
ON public.gamified_exercises(topic_content_id, game_order);

-- Populate game_order for existing records based on creation time
UPDATE gamified_exercises 
SET game_order = sub.row_num 
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY topic_content_id ORDER BY created_at) as row_num
  FROM gamified_exercises
) sub
WHERE gamified_exercises.id = sub.id;