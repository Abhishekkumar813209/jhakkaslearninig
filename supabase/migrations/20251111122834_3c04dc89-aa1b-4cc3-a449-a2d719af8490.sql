-- Fix match_pair data structure: Move pairs from answer_data to question_data
-- Simple approach without complex conversions

-- Step 1: For match_pair questions in question_bank, move pairs from answer_data to question_data
UPDATE question_bank
SET 
  question_data = jsonb_set(
    COALESCE(question_data, '{}'::jsonb),
    '{pairs}',
    COALESCE(answer_data->'pairs', '[]'::jsonb)
  ),
  answer_data = COALESCE(answer_data, '{}'::jsonb) - 'pairs'
WHERE question_type = 'match_pair'
  AND answer_data ? 'pairs'
  AND NOT (question_data ? 'pairs');

-- Step 2: For gamified_exercises, ensure match_pair exercises have pairs in exercise_data
UPDATE gamified_exercises
SET 
  exercise_data = jsonb_set(
    COALESCE(exercise_data, '{}'::jsonb),
    '{pairs}',
    COALESCE(exercise_data->'pairs', '[]'::jsonb)
  )
WHERE exercise_type = 'match_pair'
  AND (exercise_data ? 'pairs') = false;

-- Add helpful comments
COMMENT ON COLUMN question_bank.question_data IS 'JSONB: match_pair uses {pairs:[{id,left,right}]}, match_column uses {leftColumn:[],rightColumn:[]}';
COMMENT ON COLUMN gamified_exercises.exercise_data IS 'JSONB: match_pair uses {pairs:[{id,left,right}]}, match_column uses {leftColumn:[],rightColumn:[],correctPairs:[{left,right}]}';