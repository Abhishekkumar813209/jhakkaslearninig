-- Add review tracking columns to question_bank table to match generated_questions
ALTER TABLE question_bank 
  ADD COLUMN IF NOT EXISTS admin_reviewed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

-- Create index for faster filtering by review status
CREATE INDEX IF NOT EXISTS idx_question_bank_admin_reviewed ON question_bank(admin_reviewed);
CREATE INDEX IF NOT EXISTS idx_question_bank_reviewed_by ON question_bank(reviewed_by);

-- Add comment for documentation
COMMENT ON COLUMN question_bank.admin_reviewed IS 'Indicates if the question and its answer have been reviewed by an admin';
COMMENT ON COLUMN question_bank.reviewed_by IS 'Admin user who reviewed this question';
COMMENT ON COLUMN question_bank.reviewed_at IS 'Timestamp when the question was marked as reviewed';