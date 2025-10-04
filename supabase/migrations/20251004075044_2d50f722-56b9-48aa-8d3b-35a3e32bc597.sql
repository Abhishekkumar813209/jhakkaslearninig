-- Create table for student's custom chapter order
CREATE TABLE IF NOT EXISTS public.student_chapter_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  roadmap_id UUID NOT NULL REFERENCES batch_roadmaps(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  chapter_order JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, roadmap_id, subject)
);

-- Enable RLS
ALTER TABLE public.student_chapter_order ENABLE ROW LEVEL SECURITY;

-- Students can manage their own chapter order
CREATE POLICY "Students can manage their own chapter order"
  ON public.student_chapter_order
  FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Admins can view all chapter orders
CREATE POLICY "Admins can view all chapter orders"
  ON public.student_chapter_order
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create index for faster lookups
CREATE INDEX idx_student_chapter_order_lookup 
  ON public.student_chapter_order(student_id, roadmap_id, subject);