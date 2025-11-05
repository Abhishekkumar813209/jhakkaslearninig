-- Add sub_questions column for multi-part questions
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS sub_questions JSONB DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN question_bank.sub_questions IS 'Structured data for multi-part questions (True/False statements array or Fill-in-Blanks sub-questions array). Format: [{"id": 1, "text": "...", "correctAnswer": true/string, "distractors": [...]}]';