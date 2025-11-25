-- =============================================
-- PART 1: Fix student_question_attempts schema
-- =============================================

-- Drop old boolean xp_awarded column
ALTER TABLE student_question_attempts DROP COLUMN IF EXISTS xp_awarded CASCADE;

-- Add new numeric columns for fractional XP tracking
ALTER TABLE student_question_attempts
  ADD COLUMN IF NOT EXISTS total_sub_questions INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS correct_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fraction_correct NUMERIC(5,4) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS base_xp NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN xp_awarded NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN student_question_attempts.fraction_correct IS 'Correct count / total sub-questions (1.0 for single-part questions)';

-- =============================================
-- PART 2: Create student_game_views table
-- =============================================

CREATE TABLE IF NOT EXISTS student_game_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES batch_question_assignments(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0 NOT NULL,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(student_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_student_game_views_student ON student_game_views(student_id);
CREATE INDEX IF NOT EXISTS idx_student_game_views_game ON student_game_views(game_id);

-- RLS policies
ALTER TABLE student_game_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own game views" ON student_game_views;
CREATE POLICY "Students can view their own game views"
  ON student_game_views FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert their own game views" ON student_game_views;
CREATE POLICY "Students can insert their own game views"
  ON student_game_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update their own game views" ON student_game_views;
CREATE POLICY "Students can update their own game views"
  ON student_game_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id);

-- =============================================
-- PART 3: Remove NOT NULL constraint from question_text
-- =============================================

ALTER TABLE question_bank ALTER COLUMN question_text DROP NOT NULL;

-- Make other legacy columns nullable if they aren't already
ALTER TABLE question_bank ALTER COLUMN correct_answer DROP NOT NULL;
ALTER TABLE question_bank ALTER COLUMN explanation DROP NOT NULL;

COMMENT ON COLUMN question_bank.question_text IS 'DEPRECATED: Use question_data instead. Kept for backward compatibility with old data only.';
COMMENT ON COLUMN question_bank.correct_answer IS 'DEPRECATED: Use answer_data instead. Kept for backward compatibility with old data only.';