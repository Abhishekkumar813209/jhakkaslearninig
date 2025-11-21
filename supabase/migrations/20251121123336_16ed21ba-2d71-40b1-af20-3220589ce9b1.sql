-- Add sync tracking column to batch_question_assignments
ALTER TABLE batch_question_assignments
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Create index for sync queries
CREATE INDEX IF NOT EXISTS idx_batch_assignments_sync
ON batch_question_assignments(last_synced_at, is_active);