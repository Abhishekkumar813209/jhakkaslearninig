-- Add new columns to generated_questions table for proper context linking
ALTER TABLE public.generated_questions
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS exam_domain TEXT,
ADD COLUMN IF NOT EXISTS exam_name TEXT,
ADD COLUMN IF NOT EXISTS roadmap_id UUID REFERENCES public.batch_roadmaps(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.roadmap_chapters(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.roadmap_topics(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS admin_reviewed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id);

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_questions_batch ON public.generated_questions(batch_id);
CREATE INDEX IF NOT EXISTS idx_questions_domain ON public.generated_questions(exam_domain);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON public.generated_questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_reviewed ON public.generated_questions(admin_reviewed);

-- Update RLS policy to ensure students only see fully approved questions
DROP POLICY IF EXISTS "Students can view approved questions" ON public.generated_questions;

CREATE POLICY "Students can view fully approved questions"
ON public.generated_questions FOR SELECT
TO authenticated
USING (
  is_approved = true 
  AND admin_reviewed = true 
  AND correct_answer IS NOT NULL
);