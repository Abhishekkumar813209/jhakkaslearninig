-- Set all existing lecture questions to active (fix the drama)
UPDATE public.lecture_questions 
SET is_active = true 
WHERE is_active = false;