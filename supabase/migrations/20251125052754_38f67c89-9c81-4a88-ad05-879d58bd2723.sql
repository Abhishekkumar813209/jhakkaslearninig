-- Phase 1: Add difficulty column to roadmap_topics
ALTER TABLE roadmap_topics 
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium' 
  CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_roadmap_topics_difficulty ON roadmap_topics(difficulty);

-- Add comment
COMMENT ON COLUMN roadmap_topics.difficulty IS 'Topic difficulty: easy (30 XP budget), medium (40 XP budget), hard (50 XP budget)';

-- Update existing topics to have difficulty based on xp_reward
UPDATE roadmap_topics
SET difficulty = CASE
  WHEN xp_reward >= 50 THEN 'hard'
  WHEN xp_reward >= 40 THEN 'medium'
  ELSE 'easy'
END
WHERE difficulty IS NULL;