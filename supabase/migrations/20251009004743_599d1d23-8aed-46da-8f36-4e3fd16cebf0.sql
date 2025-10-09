-- Add XP and achievements tracking to test_attempts table
ALTER TABLE test_attempts 
ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS achievements_awarded JSONB DEFAULT '[]'::jsonb;

-- Add index for faster queries on XP
CREATE INDEX IF NOT EXISTS idx_test_attempts_xp_earned ON test_attempts(xp_earned);

-- Add comment for documentation
COMMENT ON COLUMN test_attempts.xp_earned IS 'Jhakkas Coins (XP) earned from this test attempt';
COMMENT ON COLUMN test_attempts.achievements_awarded IS 'Array of achievement IDs awarded from this test attempt';