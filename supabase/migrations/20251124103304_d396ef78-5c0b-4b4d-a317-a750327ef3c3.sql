-- Step 1: Clean up orphaned records from old architecture
DELETE FROM student_question_attempts sqa
WHERE NOT EXISTS (
  SELECT 1 FROM batch_question_assignments bqa 
  WHERE bqa.id = sqa.game_id
);

-- Step 2: Drop old FK constraints pointing to gamified_exercises
ALTER TABLE student_question_attempts 
  DROP CONSTRAINT IF EXISTS student_question_attempts_question_id_fkey;

ALTER TABLE student_question_attempts 
  DROP CONSTRAINT IF EXISTS fk_game_id;

-- Step 3: Add new FK constraints for reference-based architecture
ALTER TABLE student_question_attempts 
  ADD CONSTRAINT student_question_attempts_game_id_fkey 
  FOREIGN KEY (game_id) 
  REFERENCES batch_question_assignments(id) 
  ON DELETE CASCADE;

ALTER TABLE student_question_attempts 
  ADD CONSTRAINT student_question_attempts_question_id_fkey 
  FOREIGN KEY (question_id) 
  REFERENCES question_bank(id) 
  ON DELETE CASCADE;