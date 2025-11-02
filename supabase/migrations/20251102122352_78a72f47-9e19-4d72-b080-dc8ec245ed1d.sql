-- Add created_manually column to question_bank table
ALTER TABLE question_bank 
  ADD COLUMN IF NOT EXISTS created_manually boolean DEFAULT true;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_question_bank_created_manually 
  ON question_bank(created_manually);

-- Add helpful comment
COMMENT ON COLUMN question_bank.created_manually IS 
  'Indicates if question was manually created (true) or AI-generated (false)';