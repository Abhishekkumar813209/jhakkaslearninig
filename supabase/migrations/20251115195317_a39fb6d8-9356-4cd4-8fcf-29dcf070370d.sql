-- Create lecture_notes table for timestamped student notes
CREATE TABLE IF NOT EXISTS public.lecture_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_lecture_id UUID NOT NULL REFERENCES chapter_lectures(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  timestamp_seconds INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lecture_notes ENABLE ROW LEVEL SECURITY;

-- Students can view their own notes
CREATE POLICY "Students can view their own notes"
  ON public.lecture_notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- Students can insert their own notes
CREATE POLICY "Students can create their own notes"
  ON public.lecture_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- Students can update their own notes
CREATE POLICY "Students can update their own notes"
  ON public.lecture_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Students can delete their own notes
CREATE POLICY "Students can delete their own notes"
  ON public.lecture_notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

-- Add indexes for performance
CREATE INDEX idx_lecture_notes_student_lecture 
  ON public.lecture_notes(student_id, chapter_lecture_id);

CREATE INDEX idx_lecture_notes_timestamp 
  ON public.lecture_notes(chapter_lecture_id, timestamp_seconds);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_lecture_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lecture_notes_updated_at
  BEFORE UPDATE ON public.lecture_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_lecture_notes_updated_at();