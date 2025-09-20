-- First, let's add any missing columns to the existing tables

-- Update tests table to match requirements
ALTER TABLE tests ADD COLUMN IF NOT EXISTS class text;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Update questions table to match requirements  
ALTER TABLE questions ADD COLUMN IF NOT EXISTS qtype text DEFAULT 'mcq';
UPDATE questions SET qtype = 
  CASE 
    WHEN question_type::text = 'mcq' THEN 'mcq'
    WHEN question_type::text = 'subjective' THEN 'subjective'
    WHEN question_type::text = 'true-false' THEN 'mcq'
    ELSE 'mcq'
  END
WHERE qtype IS NULL;

ALTER TABLE questions ADD COLUMN IF NOT EXISTS sample_answer text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS position integer DEFAULT 1;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE questions ADD COLUMN IF NOT EXISTS word_limit integer;

-- Create storage bucket for printable tests
INSERT INTO storage.buckets (id, name, public) VALUES ('test-files', 'test-files', true) ON CONFLICT DO NOTHING;

-- Create storage policies for test files
CREATE POLICY "Admins can upload test files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'test-files' AND has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can view test files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'test-files' AND has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Test files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'test-files');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_test_id_position ON questions(test_id, position);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_student ON test_attempts(test_id, student_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_attempt_question ON test_answers(attempt_id, question_id);

-- Update questions position for existing questions
UPDATE questions 
SET position = ROW_NUMBER() OVER (PARTITION BY test_id ORDER BY order_num, created_at)
WHERE position IS NULL OR position = 1;