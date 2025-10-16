-- Priority 2: Create student progress tracking tables

-- Table 1: Track individual question attempts
CREATE TABLE IF NOT EXISTS public.student_question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES gamified_exercises(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL,
  
  -- Attempt tracking
  attempt_number INTEGER DEFAULT 1,
  selected_answer JSONB,
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,
  
  -- Progress status
  status TEXT CHECK (status IN ('attempted', 'skipped', 'completed')) DEFAULT 'attempted',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(student_id, question_id, attempt_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_attempts_student ON public.student_question_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_topic ON public.student_question_attempts(topic_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_question ON public.student_question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_status ON public.student_question_attempts(student_id, status);

-- Enable RLS
ALTER TABLE public.student_question_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_question_attempts
CREATE POLICY "Students can view their own question attempts"
  ON public.student_question_attempts
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own question attempts"
  ON public.student_question_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own question attempts"
  ON public.student_question_attempts
  FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all question attempts"
  ON public.student_question_attempts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Table 2: Track overall topic game progress
CREATE TABLE IF NOT EXISTS public.student_topic_game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL,
  
  -- Progress tracking
  current_question_index INTEGER DEFAULT 0,
  total_questions INTEGER NOT NULL,
  questions_completed INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  
  -- Session data
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- State management
  is_completed BOOLEAN DEFAULT FALSE,
  session_state JSONB DEFAULT '{}'::jsonb, -- Store answered question IDs, scores, etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(student_id, topic_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_topic_progress_student ON public.student_topic_game_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_topic ON public.student_topic_game_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_active ON public.student_topic_game_progress(student_id, is_completed);

-- Enable RLS
ALTER TABLE public.student_topic_game_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_topic_game_progress
CREATE POLICY "Students can view their own topic progress"
  ON public.student_topic_game_progress
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own topic progress"
  ON public.student_topic_game_progress
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own topic progress"
  ON public.student_topic_game_progress
  FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all topic progress"
  ON public.student_topic_game_progress
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_question_attempts_updated_at
  BEFORE UPDATE ON public.student_question_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_student_progress_updated_at();

CREATE TRIGGER trigger_update_topic_progress_updated_at
  BEFORE UPDATE ON public.student_topic_game_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_student_progress_updated_at();

-- Add helpful comments
COMMENT ON TABLE public.student_question_attempts IS 'Tracks individual question attempts by students in topic quizzes';
COMMENT ON TABLE public.student_topic_game_progress IS 'Tracks overall progress and session state for topic-based quizzes';
COMMENT ON COLUMN public.student_topic_game_progress.session_state IS 'JSON object storing completed question IDs, current position, and other session data';