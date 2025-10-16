-- Add missing columns to question_bank table for full context

-- Add chapter_id for reference (keeping topic as primary link)
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES roadmap_chapters(id) ON DELETE SET NULL;

-- Add subject for filtering
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS subject text;

-- Add batch_id for context
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES batches(id) ON DELETE SET NULL;

-- Add exam domain and name for organization
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS exam_domain text;

ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS exam_name text;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_question_bank_topic_id ON question_bank(topic_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_chapter_id ON question_bank(chapter_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_batch_id ON question_bank(batch_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_subject ON question_bank(subject);
CREATE INDEX IF NOT EXISTS idx_question_bank_exam_domain ON question_bank(exam_domain);

-- Make correct_answer nullable (admin can add it later in Lesson Builder)
ALTER TABLE question_bank 
ALTER COLUMN correct_answer DROP NOT NULL;