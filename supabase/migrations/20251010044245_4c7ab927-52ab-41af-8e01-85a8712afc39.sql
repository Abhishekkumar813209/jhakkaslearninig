-- Create table for student-customized chapter days
CREATE TABLE IF NOT EXISTS student_chapter_custom_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES roadmap_chapters(id) ON DELETE CASCADE,
  custom_days INTEGER NOT NULL CHECK (custom_days > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, chapter_id)
);

-- Enable RLS
ALTER TABLE student_chapter_custom_days ENABLE ROW LEVEL SECURITY;

-- Students can view their own custom days
CREATE POLICY "Students can view their own custom days"
ON student_chapter_custom_days FOR SELECT
USING (auth.uid() = student_id);

-- Students can insert their own custom days
CREATE POLICY "Students can insert their own custom days"
ON student_chapter_custom_days FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Students can update their own custom days
CREATE POLICY "Students can update their own custom days"
ON student_chapter_custom_days FOR UPDATE
USING (auth.uid() = student_id);

-- Students can delete their own custom days
CREATE POLICY "Students can delete their own custom days"
ON student_chapter_custom_days FOR DELETE
USING (auth.uid() = student_id);

-- Admins can manage all custom days
CREATE POLICY "Admins can manage all custom days"
ON student_chapter_custom_days FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create index for faster queries
CREATE INDEX idx_student_chapter_custom_days_student ON student_chapter_custom_days(student_id);
CREATE INDEX idx_student_chapter_custom_days_chapter ON student_chapter_custom_days(chapter_id);

-- Trigger to update updated_at
CREATE TRIGGER update_student_chapter_custom_days_updated_at
BEFORE UPDATE ON student_chapter_custom_days
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();