-- Add missing game types to question_bank constraint
ALTER TABLE question_bank 
DROP CONSTRAINT IF EXISTS question_bank_question_type_check;

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
  'figure'::text,
  'match_pairs'::text,
  'sequence_order'::text,
  'typing_race'::text,
  'card_memory'::text,
  'interactive_blanks'::text
]));