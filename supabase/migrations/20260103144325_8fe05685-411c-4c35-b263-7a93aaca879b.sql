-- Drop existing foreign key constraint on question_id (references questions table)
ALTER TABLE public.lecture_questions 
DROP CONSTRAINT IF EXISTS lecture_questions_question_id_fkey;

-- Add new foreign key constraint referencing question_bank
ALTER TABLE public.lecture_questions 
ADD CONSTRAINT lecture_questions_question_id_fkey 
FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;