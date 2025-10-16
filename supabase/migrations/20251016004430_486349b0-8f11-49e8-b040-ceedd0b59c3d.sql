-- Create question_bank table for the new simplified question management system
CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.roadmap_topics(id) ON DELETE CASCADE,
  
  -- Question content
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'true_false', 'fill_blank', 'subjective', 'matching')),
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  
  -- Scoring and metadata
  marks INTEGER NOT NULL DEFAULT 1,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  -- Publishing control
  is_published BOOLEAN DEFAULT false,
  
  -- Admin tracking
  created_by UUID REFERENCES auth.users(id),
  source_file_name TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can do everything
CREATE POLICY "admin_all" ON public.question_bank
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policy: Students can only view published questions
CREATE POLICY "students_view_published" ON public.question_bank
FOR SELECT
TO authenticated
USING (is_published = true);

-- Create index for faster topic queries
CREATE INDEX idx_question_bank_topic_id ON public.question_bank(topic_id);
CREATE INDEX idx_question_bank_published ON public.question_bank(is_published) WHERE is_published = true;

-- Trigger for updated_at
CREATE TRIGGER update_question_bank_updated_at
  BEFORE UPDATE ON public.question_bank
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();