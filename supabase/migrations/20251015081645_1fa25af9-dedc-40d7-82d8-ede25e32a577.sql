-- Add language support and checkpoint system to topic_learning_content
ALTER TABLE topic_learning_content 
ADD COLUMN IF NOT EXISTS theory_language text DEFAULT 'english',
ADD COLUMN IF NOT EXISTS checkpoint_config jsonb;

-- Create student checkpoint progress tracking table
CREATE TABLE IF NOT EXISTS student_checkpoint_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES topic_learning_content(id) ON DELETE CASCADE,
  section_index integer NOT NULL,
  checkpoint_answered boolean DEFAULT false,
  is_correct boolean,
  attempts integer DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies for checkpoint progress
ALTER TABLE student_checkpoint_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own checkpoint progress"
  ON student_checkpoint_progress FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own checkpoint progress"
  ON student_checkpoint_progress FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own checkpoint progress"
  ON student_checkpoint_progress FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all checkpoint progress"
  ON student_checkpoint_progress FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Add updated_at trigger
CREATE TRIGGER update_checkpoint_progress_updated_at
  BEFORE UPDATE ON student_checkpoint_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_checkpoint_progress_student 
  ON student_checkpoint_progress(student_id, lesson_id);