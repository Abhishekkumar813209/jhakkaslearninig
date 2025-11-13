-- Create chapter_lectures table for chapter-level YouTube lectures
CREATE TABLE public.chapter_lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  youtube_video_id TEXT NOT NULL,
  video_duration_seconds INTEGER NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  lecture_order INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student_lecture_progress table for tracking student lecture watch progress
CREATE TABLE public.student_lecture_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  chapter_lecture_id UUID NOT NULL REFERENCES public.chapter_lectures(id) ON DELETE CASCADE,
  watch_time_seconds INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, chapter_lecture_id)
);

-- Create indexes for performance
CREATE INDEX idx_chapter_lectures_chapter_id ON public.chapter_lectures(chapter_id);
CREATE INDEX idx_chapter_lectures_order ON public.chapter_lectures(chapter_id, lecture_order);
CREATE INDEX idx_student_lecture_progress_student ON public.student_lecture_progress(student_id);
CREATE INDEX idx_student_lecture_progress_lecture ON public.student_lecture_progress(chapter_lecture_id);

-- Enable RLS
ALTER TABLE public.chapter_lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lecture_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_lectures
CREATE POLICY "Admins can manage all lectures"
  ON public.chapter_lectures
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view published lectures"
  ON public.chapter_lectures
  FOR SELECT
  USING (is_published = true);

-- RLS Policies for student_lecture_progress
CREATE POLICY "Students can view their own lecture progress"
  ON public.student_lecture_progress
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own lecture progress"
  ON public.student_lecture_progress
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own lecture progress"
  ON public.student_lecture_progress
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all lecture progress"
  ON public.student_lecture_progress
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_chapter_lectures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chapter_lectures_updated_at
  BEFORE UPDATE ON public.chapter_lectures
  FOR EACH ROW
  EXECUTE FUNCTION update_chapter_lectures_updated_at();