-- Add new columns to questions table for advanced question types
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS assertion TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS left_column JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS right_column JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS blanks_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS question_tags JSONB DEFAULT '[]'::jsonb;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING gin(question_tags);

-- Add check constraint for difficulty
ALTER TABLE questions 
ADD CONSTRAINT check_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Add helpful comments
COMMENT ON COLUMN questions.assertion IS 'For assertion-reason type questions: the assertion statement';
COMMENT ON COLUMN questions.reason IS 'For assertion-reason type questions: the reason statement';
COMMENT ON COLUMN questions.left_column IS 'For match-the-column type questions: array of left column items';
COMMENT ON COLUMN questions.right_column IS 'For match-the-column type questions: array of right column items';
COMMENT ON COLUMN questions.blanks_count IS 'For fill-in-the-blank type questions: number of blanks';
COMMENT ON COLUMN questions.difficulty IS 'Difficulty level: easy, medium, or hard';
COMMENT ON COLUMN questions.question_tags IS 'Array of tags for categorization and filtering';