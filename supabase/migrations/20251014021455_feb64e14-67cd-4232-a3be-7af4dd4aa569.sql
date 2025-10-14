-- Create daily_study_logs table for tracking study hours by day
CREATE TABLE IF NOT EXISTS public.daily_study_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  study_minutes INTEGER DEFAULT 0,
  tests_taken INTEGER DEFAULT 0,
  lessons_watched INTEGER DEFAULT 0,
  topics_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_study_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own study logs"
  ON public.daily_study_logs
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own study logs"
  ON public.daily_study_logs
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own study logs"
  ON public.daily_study_logs
  FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all study logs"
  ON public.daily_study_logs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create indexes for performance
CREATE INDEX idx_daily_study_logs_student ON public.daily_study_logs(student_id);
CREATE INDEX idx_daily_study_logs_date ON public.daily_study_logs(student_id, date DESC);

-- Create trigger to update updated_at
CREATE TRIGGER update_daily_study_logs_updated_at
  BEFORE UPDATE ON public.daily_study_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update daily study log
CREATE OR REPLACE FUNCTION public.update_daily_study_log(
  p_student_id UUID,
  p_study_minutes INTEGER DEFAULT 0,
  p_tests_taken INTEGER DEFAULT 0,
  p_lessons_watched INTEGER DEFAULT 0,
  p_topics_completed INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.daily_study_logs (
    student_id,
    date,
    study_minutes,
    tests_taken,
    lessons_watched,
    topics_completed
  )
  VALUES (
    p_student_id,
    CURRENT_DATE,
    p_study_minutes,
    p_tests_taken,
    p_lessons_watched,
    p_topics_completed
  )
  ON CONFLICT (student_id, date) DO UPDATE SET
    study_minutes = daily_study_logs.study_minutes + EXCLUDED.study_minutes,
    tests_taken = daily_study_logs.tests_taken + EXCLUDED.tests_taken,
    lessons_watched = daily_study_logs.lessons_watched + EXCLUDED.lessons_watched,
    topics_completed = daily_study_logs.topics_completed + EXCLUDED.topics_completed,
    updated_at = now();
END;
$$;

-- Trigger to log test study time
CREATE OR REPLACE FUNCTION public.log_test_study_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration_minutes INTEGER;
BEGIN
  IF NEW.status IN ('submitted', 'auto_submitted') AND OLD.status = 'in_progress' THEN
    -- Calculate duration in minutes
    v_duration_minutes := EXTRACT(EPOCH FROM (NEW.submitted_at - NEW.started_at)) / 60;
    
    -- Update daily study log
    PERFORM update_daily_study_log(
      NEW.student_id,
      v_duration_minutes,
      1, -- tests_taken
      0,
      0
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on test_attempts
DROP TRIGGER IF EXISTS log_test_time_trigger ON public.test_attempts;
CREATE TRIGGER log_test_time_trigger
  AFTER UPDATE ON public.test_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_test_study_time();