-- Add XP configuration columns to tests table
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS base_xp_reward INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS xp_per_mark INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS bonus_xp_on_perfect INTEGER DEFAULT 50;

-- Add comment for clarity
COMMENT ON COLUMN tests.base_xp_reward IS 'Base XP awarded for completing the test';
COMMENT ON COLUMN tests.xp_per_mark IS 'XP awarded per mark obtained';
COMMENT ON COLUMN tests.bonus_xp_on_perfect IS 'Bonus XP awarded for perfect score';

-- Add optional XP reward column to questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT NULL;

COMMENT ON COLUMN questions.xp_reward IS 'Optional custom XP reward for this question (overrides formula if set)';