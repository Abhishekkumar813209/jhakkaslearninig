-- Add missing columns to question_bank table
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assertion TEXT;