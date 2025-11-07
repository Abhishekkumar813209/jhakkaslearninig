-- Phase 1: Add new JSONB columns and migrate existing data
-- This migration is backward-compatible and non-breaking

-- Step 1: Add new JSONB columns (nullable for now)
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS question_data JSONB,
ADD COLUMN IF NOT EXISTS answer_data JSONB;

-- Step 2: Migrate existing data to new JSONB columns based on question_type

-- MCQ Questions - extract correct answer index from options array
UPDATE question_bank
SET 
  question_data = jsonb_build_object(
    'text', question_text,
    'options', COALESCE(options, '[]'::jsonb),
    'type', 'mcq'
  ),
  answer_data = jsonb_build_object(
    'correctIndex', COALESCE(
      (
        SELECT idx - 1 
        FROM jsonb_array_elements(options) WITH ORDINALITY arr(elem, idx)
        WHERE elem->>'isCorrect' = 'true'
        LIMIT 1
      ), 
      0
    ),
    'explanation', explanation
  )
WHERE question_type = 'mcq' 
  AND question_data IS NULL;

-- Match Pairs Questions - stored in correct_answer as JSON text
UPDATE question_bank
SET 
  question_data = CASE
    WHEN correct_answer IS NOT NULL AND correct_answer LIKE '{%' THEN
      jsonb_build_object(
        'pairs', (correct_answer::jsonb)->'pairs',
        'type', 'match_pairs'
      )
    ELSE
      jsonb_build_object(
        'pairs', '[]'::jsonb,
        'type', 'match_pairs'
      )
  END,
  answer_data = CASE
    WHEN correct_answer IS NOT NULL AND correct_answer LIKE '{%' THEN
      jsonb_build_object(
        'pairs', (correct_answer::jsonb)->'pairs',
        'explanation', explanation
      )
    ELSE
      jsonb_build_object(
        'pairs', '[]'::jsonb,
        'explanation', explanation
      )
  END
WHERE question_type = 'match_pairs'
  AND question_data IS NULL;

-- Match Column Questions (Line Matching) - uses left_column and right_column arrays
UPDATE question_bank
SET 
  question_data = jsonb_build_object(
    'leftColumn', COALESCE(
      (SELECT jsonb_agg(elem) FROM unnest(left_column) elem),
      '[]'::jsonb
    ),
    'rightColumn', COALESCE(
      (SELECT jsonb_agg(elem) FROM unnest(right_column) elem),
      '[]'::jsonb
    ),
    'questionText', question_text,
    'type', 'match_column'
  ),
  answer_data = CASE
    WHEN correct_answer IS NOT NULL AND correct_answer LIKE '{%' THEN
      jsonb_build_object(
        'correctPairs', (correct_answer::jsonb)->'pairs',
        'explanation', explanation
      )
    ELSE
      jsonb_build_object(
        'correctPairs', '[]'::jsonb,
        'explanation', explanation
      )
  END
WHERE question_type = 'match_column'
  AND question_data IS NULL;

-- Fill in the Blanks Questions
UPDATE question_bank
SET 
  question_data = CASE
    WHEN correct_answer IS NOT NULL AND correct_answer LIKE '{%' THEN
      jsonb_build_object(
        'text', question_text,
        'blanks', COALESCE((correct_answer::jsonb)->'blanks', '[]'::jsonb),
        'type', 'fill_blank'
      )
    ELSE
      jsonb_build_object(
        'text', question_text,
        'blanks', '[]'::jsonb,
        'type', 'fill_blank'
      )
  END,
  answer_data = CASE
    WHEN correct_answer IS NOT NULL AND correct_answer LIKE '{%' THEN
      jsonb_build_object(
        'blanks', COALESCE((correct_answer::jsonb)->'blanks', '[]'::jsonb),
        'explanation', explanation
      )
    ELSE
      jsonb_build_object(
        'blanks', '[]'::jsonb,
        'explanation', explanation
      )
  END
WHERE question_type IN ('fill_blank', 'interactive_blanks', 'drag_drop_blanks')
  AND question_data IS NULL;

-- True/False Questions
UPDATE question_bank
SET 
  question_data = jsonb_build_object(
    'statement', question_text,
    'type', 'true_false'
  ),
  answer_data = CASE
    WHEN correct_answer IS NOT NULL AND correct_answer LIKE '{%' AND (correct_answer::jsonb) ? 'value' THEN
      jsonb_build_object(
        'value', ((correct_answer::jsonb)->>'value')::boolean,
        'explanation', explanation
      )
    WHEN correct_answer = 'true' OR correct_answer = 't' OR correct_answer = '1' THEN
      jsonb_build_object(
        'value', true,
        'explanation', explanation
      )
    ELSE
      jsonb_build_object(
        'value', false,
        'explanation', explanation
      )
  END
WHERE question_type = 'true_false'
  AND question_data IS NULL;

-- Drag Drop Sort/Sequence Questions
UPDATE question_bank
SET 
  question_data = CASE
    WHEN correct_answer IS NOT NULL AND correct_answer LIKE '{%' THEN
      jsonb_build_object(
        'text', question_text,
        'items', COALESCE((correct_answer::jsonb)->'items', options, '[]'::jsonb),
        'type', 'drag_drop_sort'
      )
    ELSE
      jsonb_build_object(
        'text', question_text,
        'items', COALESCE(options, '[]'::jsonb),
        'type', 'drag_drop_sort'
      )
  END,
  answer_data = CASE
    WHEN correct_answer IS NOT NULL AND correct_answer LIKE '{%' THEN
      jsonb_build_object(
        'correctOrder', COALESCE((correct_answer::jsonb)->'correctOrder', '[]'::jsonb),
        'explanation', explanation
      )
    ELSE
      jsonb_build_object(
        'correctOrder', '[]'::jsonb,
        'explanation', explanation
      )
  END
WHERE question_type IN ('drag_drop_sort', 'sequence_order')
  AND question_data IS NULL;

-- Typing Race Questions
UPDATE question_bank
SET 
  question_data = jsonb_build_object(
    'text', question_text,
    'targetText', question_text,
    'type', 'typing_race'
  ),
  answer_data = jsonb_build_object(
    'targetText', question_text,
    'explanation', explanation
  )
WHERE question_type = 'typing_race'
  AND question_data IS NULL;

-- Assertion-Reason Questions (if any exist)
UPDATE question_bank
SET 
  question_data = jsonb_build_object(
    'assertion', assertion,
    'reason', reason,
    'type', 'assertion_reason'
  ),
  answer_data = CASE
    WHEN correct_answer IS NOT NULL AND correct_answer LIKE '{%' THEN
      jsonb_build_object(
        'correctOption', COALESCE((correct_answer::jsonb)->>'correctOption', 'A'),
        'explanation', explanation
      )
    ELSE
      jsonb_build_object(
        'correctOption', COALESCE(correct_answer, 'A'),
        'explanation', explanation
      )
  END
WHERE question_type = 'assertion_reason'
  AND question_data IS NULL;

-- Create indexes for better query performance on JSONB columns
CREATE INDEX IF NOT EXISTS idx_question_bank_question_data ON question_bank USING gin (question_data);
CREATE INDEX IF NOT EXISTS idx_question_bank_answer_data ON question_bank USING gin (answer_data);

-- Add comment to document the migration
COMMENT ON COLUMN question_bank.question_data IS 'Unified JSONB storage for all question types - contains question text, options, pairs, etc.';
COMMENT ON COLUMN question_bank.answer_data IS 'Unified JSONB storage for all answer types - contains correct answers, explanations, etc.';