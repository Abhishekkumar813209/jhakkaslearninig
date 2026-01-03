-- Create lecture_questions table to store questions at specific video timestamps
CREATE TABLE public.lecture_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.chapter_lectures(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  timestamp_seconds INTEGER NOT NULL,
  timer_seconds INTEGER DEFAULT 15,
  order_in_group INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lecture_id, question_id)
);

-- Create index for quick lookup during video playback
CREATE INDEX idx_lecture_questions_timestamp ON public.lecture_questions(lecture_id, timestamp_seconds);
CREATE INDEX idx_lecture_questions_lecture ON public.lecture_questions(lecture_id);

-- Create student_lecture_question_responses table to track student answers
CREATE TABLE public.student_lecture_question_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_question_id UUID NOT NULL REFERENCES public.lecture_questions(id) ON DELETE CASCADE,
  response JSONB NOT NULL,
  is_correct BOOLEAN,
  time_taken_seconds INTEGER,
  xp_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lecture_question_id)
);

-- Create indexes for student responses
CREATE INDEX idx_student_lecture_responses_student ON public.student_lecture_question_responses(student_id);
CREATE INDEX idx_student_lecture_responses_question ON public.student_lecture_question_responses(lecture_question_id);

-- Enable RLS on both tables
ALTER TABLE public.lecture_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lecture_question_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lecture_questions
CREATE POLICY "Anyone can view active lecture questions"
ON public.lecture_questions
FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can insert lecture questions"
ON public.lecture_questions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update lecture questions"
ON public.lecture_questions
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete lecture questions"
ON public.lecture_questions
FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for student_lecture_question_responses
CREATE POLICY "Students can view their own responses"
ON public.student_lecture_question_responses
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own responses"
ON public.student_lecture_question_responses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own responses"
ON public.student_lecture_question_responses
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id);