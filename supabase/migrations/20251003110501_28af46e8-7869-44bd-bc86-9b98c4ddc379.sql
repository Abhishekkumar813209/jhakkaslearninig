-- Sprint 3: Student Assignment & Roadmap Linking

-- Create student_roadmaps table to track individual student progress on batch roadmaps
CREATE TABLE IF NOT EXISTS public.student_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  batch_roadmap_id UUID NOT NULL REFERENCES public.batch_roadmaps(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  UNIQUE(student_id, batch_roadmap_id)
);

-- Enable RLS
ALTER TABLE public.student_roadmaps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_roadmaps
CREATE POLICY "Students can view their own roadmaps"
  ON public.student_roadmaps
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins can manage all student roadmaps"
  ON public.student_roadmaps
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create student_chapter_progress table
CREATE TABLE IF NOT EXISTS public.student_chapter_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  chapter_id UUID NOT NULL REFERENCES public.roadmap_chapters(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, chapter_id)
);

-- Enable RLS
ALTER TABLE public.student_chapter_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own chapter progress"
  ON public.student_chapter_progress
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can update their own chapter progress"
  ON public.student_chapter_progress
  FOR UPDATE
  USING (student_id = auth.uid());

CREATE POLICY "Admins can manage all chapter progress"
  ON public.student_chapter_progress
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create student_topic_progress table
CREATE TABLE IF NOT EXISTS public.student_topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  topic_id UUID NOT NULL REFERENCES public.roadmap_topics(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, topic_id)
);

-- Enable RLS
ALTER TABLE public.student_topic_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own topic progress"
  ON public.student_topic_progress
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can update their own topic progress"
  ON public.student_topic_progress
  FOR UPDATE
  USING (student_id = auth.uid());

CREATE POLICY "Admins can manage all topic progress"
  ON public.student_topic_progress
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Function to auto-assign roadmap to student when added to batch
CREATE OR REPLACE FUNCTION assign_batch_roadmap_to_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roadmap_id UUID;
BEGIN
  -- Get the linked roadmap for the batch (if exists)
  SELECT linked_roadmap_id INTO v_roadmap_id
  FROM batches
  WHERE id = NEW.batch_id AND auto_assign_roadmap = true;

  -- If there's a linked roadmap, assign it to the student
  IF v_roadmap_id IS NOT NULL THEN
    INSERT INTO student_roadmaps (student_id, batch_roadmap_id)
    VALUES (NEW.id, v_roadmap_id)
    ON CONFLICT (student_id, batch_roadmap_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger when student's batch_id is updated in profiles
CREATE TRIGGER on_student_batch_assigned
  AFTER UPDATE OF batch_id ON profiles
  FOR EACH ROW
  WHEN (NEW.batch_id IS NOT NULL AND (OLD.batch_id IS NULL OR OLD.batch_id != NEW.batch_id))
  EXECUTE FUNCTION assign_batch_roadmap_to_student();

-- Also trigger on insert
CREATE TRIGGER on_student_profile_created_with_batch
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.batch_id IS NOT NULL)
  EXECUTE FUNCTION assign_batch_roadmap_to_student();

-- Add indexes for performance
CREATE INDEX idx_student_roadmaps_student ON student_roadmaps(student_id);
CREATE INDEX idx_student_roadmaps_batch_roadmap ON student_roadmaps(batch_roadmap_id);
CREATE INDEX idx_student_chapter_progress_student ON student_chapter_progress(student_id);
CREATE INDEX idx_student_chapter_progress_chapter ON student_chapter_progress(chapter_id);
CREATE INDEX idx_student_topic_progress_student ON student_topic_progress(student_id);
CREATE INDEX idx_student_topic_progress_topic ON student_topic_progress(topic_id);

-- Trigger for updated_at
CREATE TRIGGER update_student_roadmaps_updated_at
  BEFORE UPDATE ON student_roadmaps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_chapter_progress_updated_at
  BEFORE UPDATE ON student_chapter_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_topic_progress_updated_at
  BEFORE UPDATE ON student_topic_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();