-- Create options table for MCQ questions
CREATE TABLE IF NOT EXISTS public.options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  order_num INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_options_question_id ON public.options(question_id);
CREATE INDEX IF NOT EXISTS idx_options_order ON public.options(question_id, order_num);

-- Enable RLS on options table
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for options table
CREATE POLICY "Instructors can manage options for their test questions"
ON public.options FOR ALL
TO authenticated
USING (
  question_id IN (
    SELECT q.id FROM public.questions q
    INNER JOIN public.tests t ON q.test_id = t.id
    WHERE t.created_by = auth.uid()
  )
);

CREATE POLICY "Students can view options during active attempts"
ON public.options FOR SELECT
TO authenticated
USING (
  question_id IN (
    SELECT q.id FROM public.questions q
    INNER JOIN public.test_attempts ta ON q.test_id = ta.test_id
    WHERE ta.student_id = auth.uid() AND ta.status = 'in_progress'
  )
);

CREATE POLICY "Students can view options after test completion"
ON public.options FOR SELECT
TO authenticated
USING (
  question_id IN (
    SELECT q.id FROM public.questions q
    WHERE has_completed_test(q.test_id) AND q.test_id IN (
      SELECT t.id FROM public.tests t WHERE t.is_published = true
    )
  )
);

CREATE POLICY "Admins can view all options"
ON public.options FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Update test_answers table to reference options
ALTER TABLE public.test_answers 
ADD COLUMN IF NOT EXISTS option_id UUID REFERENCES public.options(id);