-- Add simple columns to gamified_exercises table
ALTER TABLE gamified_exercises 
ADD COLUMN IF NOT EXISTS question_text text,
ADD COLUMN IF NOT EXISTS options jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS marks integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS correct_answer_index integer;

-- Migrate existing data from exercise_data to new columns
UPDATE gamified_exercises 
SET 
  question_text = COALESCE(exercise_data->>'question', ''),
  options = COALESCE(exercise_data->'options', '[]'::jsonb),
  marks = COALESCE((exercise_data->>'marks')::integer, 1),
  correct_answer_index = CASE 
    WHEN correct_answer ? 'correctAnswerIndex' THEN (correct_answer->>'correctAnswerIndex')::integer
    WHEN correct_answer ? 'value' THEN (correct_answer->>'value')::integer
    WHEN correct_answer ? 'index' THEN (correct_answer->>'index')::integer
    WHEN exercise_data ? 'correct_answer' THEN (exercise_data->>'correct_answer')::integer
    ELSE 0
  END
WHERE exercise_data IS NOT NULL AND question_text IS NULL;

-- Make new columns NOT NULL after migration
ALTER TABLE gamified_exercises 
ALTER COLUMN question_text SET NOT NULL,
ALTER COLUMN options SET NOT NULL,
ALTER COLUMN correct_answer_index SET DEFAULT 0;