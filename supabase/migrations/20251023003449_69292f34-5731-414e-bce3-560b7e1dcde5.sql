-- Phase 2.1: Make gamified_exercises schema flexible
-- Make direct columns NULLABLE (optional, only for MCQ optimization)
ALTER TABLE gamified_exercises 
  ALTER COLUMN question_text DROP NOT NULL,
  ALTER COLUMN options DROP NOT NULL;

-- Ensure exercise_data is NOT NULL (primary flexible storage)
ALTER TABLE gamified_exercises 
  ALTER COLUMN exercise_data SET NOT NULL,
  ALTER COLUMN exercise_data SET DEFAULT '{}'::jsonb;

-- Add comments for clarity
COMMENT ON COLUMN gamified_exercises.question_text IS 'Optimization: Direct access for MCQ games only. Use exercise_data for other types.';
COMMENT ON COLUMN gamified_exercises.exercise_data IS 'Primary flexible storage for ALL game types. Contains complete game configuration.';
COMMENT ON COLUMN gamified_exercises.exercise_type IS 'Type of game: mcq, true_false, match_pairs, fill_blank, interactive_blanks, drag_drop_sort, typing_race, concept_puzzle, physics_simulator';

-- Data migration: Copy MCQ data from direct columns to exercise_data if empty
UPDATE gamified_exercises
SET exercise_data = jsonb_build_object(
  'question', question_text,
  'options', options,
  'correct_answer', correct_answer_index,
  'marks', marks,
  'explanation', explanation,
  'difficulty', difficulty
)
WHERE exercise_type = 'mcq' 
  AND (exercise_data = '{}'::jsonb OR exercise_data = 'null'::jsonb OR exercise_data IS NULL)
  AND question_text IS NOT NULL;