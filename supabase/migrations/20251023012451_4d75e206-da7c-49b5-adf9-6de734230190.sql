-- ============================================
-- Question Bank MCQ Index Migration ONLY
-- Convert 1-based indices to 0-based
-- ============================================

-- Step 1: Update existing questions with indices (1,2,3,4 -> 0,1,2,3)
UPDATE question_bank
SET correct_answer = (CAST(correct_answer AS INTEGER) - 1)::text
WHERE question_type = 'mcq'
  AND correct_answer ~ '^\d+$'
  AND CAST(correct_answer AS INTEGER) > 0;

-- Step 2: Add constraint to ensure valid indices  
ALTER TABLE question_bank
ADD CONSTRAINT check_mcq_answer_format 
CHECK (
  question_type != 'mcq' OR 
  correct_answer IS NULL OR 
  (correct_answer ~ '^\d+$' AND CAST(correct_answer AS INTEGER) >= 0)
);

-- Step 3: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_question_bank_mcq_with_answer 
ON question_bank(question_type, correct_answer) 
WHERE question_type = 'mcq' AND correct_answer IS NOT NULL;

-- Log statistics
DO $$
DECLARE
  migrated_count INTEGER;
  null_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM question_bank
  WHERE question_type = 'mcq';
  
  SELECT COUNT(*) INTO migrated_count
  FROM question_bank
  WHERE question_type = 'mcq' AND correct_answer IS NOT NULL;
  
  SELECT COUNT(*) INTO null_count
  FROM question_bank
  WHERE question_type = 'mcq' AND correct_answer IS NULL;
  
  RAISE NOTICE '✅ Question Bank Migration Complete:';
  RAISE NOTICE '  - Total MCQ questions: %', total_count;
  RAISE NOTICE '  - Migrated (0-based): %', migrated_count;
  RAISE NOTICE '  - Needs Admin Review (NULL): %', null_count;
END $$;