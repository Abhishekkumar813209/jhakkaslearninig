-- Add question_number and reason columns to question_bank table
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS question_number TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT;