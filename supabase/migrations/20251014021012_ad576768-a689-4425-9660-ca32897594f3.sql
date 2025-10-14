-- Create student_course_history table to track course access
CREATE TABLE IF NOT EXISTS public.student_course_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  total_time_minutes INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  last_lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Enable RLS
ALTER TABLE public.student_course_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own course history"
  ON public.student_course_history
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own course history"
  ON public.student_course_history
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own course history"
  ON public.student_course_history
  FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all course history"
  ON public.student_course_history
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create indexes for performance
CREATE INDEX idx_student_course_history_student ON public.student_course_history(student_id);
CREATE INDEX idx_student_course_history_last_accessed ON public.student_course_history(student_id, last_accessed_at DESC);

-- Create trigger to update updated_at
CREATE TRIGGER update_student_course_history_updated_at
  BEFORE UPDATE ON public.student_course_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();