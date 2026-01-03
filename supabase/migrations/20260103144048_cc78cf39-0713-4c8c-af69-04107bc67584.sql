-- Add is_lecture_question column to question_bank for lecture-specific questions
ALTER TABLE public.question_bank 
ADD COLUMN IF NOT EXISTS is_lecture_question BOOLEAN DEFAULT false;

-- Add index for faster lecture question lookups
CREATE INDEX IF NOT EXISTS idx_question_bank_lecture_questions 
ON public.question_bank (chapter_library_id, is_lecture_question) 
WHERE is_lecture_question = true;