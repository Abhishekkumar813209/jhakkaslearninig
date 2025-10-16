-- Update question_bank constraint to accept all AI-generated question types
-- This allows the AI extraction to save all question types without mapping

-- Drop the old restrictive constraint
ALTER TABLE question_bank 
DROP CONSTRAINT IF EXISTS question_bank_question_type_check;

-- Add new comprehensive constraint that includes all AI-generated types
ALTER TABLE question_bank 
ADD CONSTRAINT question_bank_question_type_check 
CHECK (question_type = ANY (ARRAY[
  'mcq'::text,
  'true_false'::text,
  'fill_blank'::text,
  'subjective'::text,
  'matching'::text,
  'assertion_reason'::text,
  'match_column'::text,
  'short_answer'::text,
  'numerical'::text,
  'figure'::text
]));