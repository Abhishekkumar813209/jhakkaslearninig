-- Create enum for exercise types
CREATE TYPE exercise_type AS ENUM ('theory', 'mcq', 'fill_up', 'true_false', 'match_column', 'subjective', 'drag_drop_sort', 'interactive_label');

-- Create enum for roadmap status
CREATE TYPE roadmap_status AS ENUM ('draft', 'active', 'completed', 'archived');

-- Create enum for topic status
CREATE TYPE topic_status AS ENUM ('locked', 'unlocked', 'in_progress', 'completed');

-- 1. Batch Roadmaps Table (15-day learning plans)
CREATE TABLE public.batch_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  total_days INTEGER NOT NULL DEFAULT 15,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status roadmap_status DEFAULT 'draft',
  ai_generated_plan JSONB,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Roadmap Chapters Table (chapters within roadmap)
CREATE TABLE public.roadmap_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES public.batch_roadmaps(id) ON DELETE CASCADE NOT NULL,
  chapter_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  estimated_days INTEGER NOT NULL,
  day_start INTEGER NOT NULL,
  day_end INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Roadmap Topics Table (topics within chapters)
CREATE TABLE public.roadmap_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES public.roadmap_chapters(id) ON DELETE CASCADE NOT NULL,
  topic_name TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  estimated_hours NUMERIC(4,2) NOT NULL,
  day_number INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 50,
  coin_reward INTEGER DEFAULT 10,
  unlock_condition TEXT DEFAULT 'previous_complete',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Topic Content Mapping Table (links content to topics)
CREATE TABLE public.topic_content_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.roadmap_topics(id) ON DELETE CASCADE NOT NULL,
  content_type exercise_type NOT NULL,
  content_id UUID,
  study_content_id UUID REFERENCES public.study_content(id),
  question_id UUID REFERENCES public.generated_questions(id),
  order_num INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  xp_value INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Student Roadmap Progress Table (tracks individual progress)
CREATE TABLE public.student_roadmap_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  roadmap_id UUID REFERENCES public.batch_roadmaps(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.roadmap_topics(id) ON DELETE CASCADE NOT NULL,
  status topic_status DEFAULT 'locked',
  progress_percentage INTEGER DEFAULT 0,
  completed_exercises INTEGER DEFAULT 0,
  total_exercises INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, topic_id)
);

-- 6. Gamified Exercises Table (individual exercises within topics)
CREATE TABLE public.gamified_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_content_id UUID REFERENCES public.topic_content_mapping(id) ON DELETE CASCADE NOT NULL,
  exercise_type exercise_type NOT NULL,
  exercise_data JSONB NOT NULL,
  correct_answer JSONB,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium',
  xp_reward INTEGER DEFAULT 10,
  coin_reward INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Student XP and Coins Table
CREATE TABLE public.student_xp_coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_xp INTEGER DEFAULT 0,
  total_coins INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Content Modification History Table
CREATE TABLE public.content_modification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  original_content TEXT NOT NULL,
  modified_content TEXT NOT NULL,
  modification_prompt TEXT,
  modified_by UUID REFERENCES auth.users(id) NOT NULL,
  modified_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_batch_roadmaps_batch ON public.batch_roadmaps(batch_id);
CREATE INDEX idx_roadmap_chapters_roadmap ON public.roadmap_chapters(roadmap_id);
CREATE INDEX idx_roadmap_topics_chapter ON public.roadmap_topics(chapter_id);
CREATE INDEX idx_topic_content_topic ON public.topic_content_mapping(topic_id);
CREATE INDEX idx_student_progress_student ON public.student_roadmap_progress(student_id);
CREATE INDEX idx_student_progress_roadmap ON public.student_roadmap_progress(roadmap_id);
CREATE INDEX idx_student_xp_student ON public.student_xp_coins(student_id);
CREATE INDEX idx_modification_history_content ON public.content_modification_history(content_id, content_type);

-- Create triggers for updated_at
CREATE TRIGGER update_batch_roadmaps_updated_at
  BEFORE UPDATE ON public.batch_roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_xp_coins_updated_at
  BEFORE UPDATE ON public.student_xp_coins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.batch_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_content_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_roadmap_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamified_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_xp_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_modification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for batch_roadmaps
CREATE POLICY "Admins can manage all roadmaps"
  ON public.batch_roadmaps FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view roadmaps for their batch"
  ON public.batch_roadmaps FOR SELECT
  USING (batch_id IN (SELECT p.batch_id FROM public.profiles p WHERE p.id = auth.uid()));

-- RLS Policies for roadmap_chapters
CREATE POLICY "Admins can manage all chapters"
  ON public.roadmap_chapters FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view chapters in their roadmaps"
  ON public.roadmap_chapters FOR SELECT
  USING (roadmap_id IN (
    SELECT br.id FROM public.batch_roadmaps br
    JOIN public.profiles p ON br.batch_id = p.batch_id
    WHERE p.id = auth.uid()
  ));

-- RLS Policies for roadmap_topics
CREATE POLICY "Admins can manage all topics"
  ON public.roadmap_topics FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view topics in their chapters"
  ON public.roadmap_topics FOR SELECT
  USING (chapter_id IN (
    SELECT rc.id FROM public.roadmap_chapters rc
    JOIN public.batch_roadmaps br ON rc.roadmap_id = br.id
    JOIN public.profiles p ON br.batch_id = p.batch_id
    WHERE p.id = auth.uid()
  ));

-- RLS Policies for topic_content_mapping
CREATE POLICY "Admins can manage all content mappings"
  ON public.topic_content_mapping FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view content for their topics"
  ON public.topic_content_mapping FOR SELECT
  USING (topic_id IN (
    SELECT rt.id FROM public.roadmap_topics rt
    JOIN public.roadmap_chapters rc ON rt.chapter_id = rc.id
    JOIN public.batch_roadmaps br ON rc.roadmap_id = br.id
    JOIN public.profiles p ON br.batch_id = p.batch_id
    WHERE p.id = auth.uid()
  ));

-- RLS Policies for student_roadmap_progress
CREATE POLICY "Students can manage their own progress"
  ON public.student_roadmap_progress FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "Admins can view all progress"
  ON public.student_roadmap_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for gamified_exercises
CREATE POLICY "Admins can manage all exercises"
  ON public.gamified_exercises FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view exercises in their content"
  ON public.gamified_exercises FOR SELECT
  USING (topic_content_id IN (
    SELECT tcm.id FROM public.topic_content_mapping tcm
    JOIN public.roadmap_topics rt ON tcm.topic_id = rt.id
    JOIN public.roadmap_chapters rc ON rt.chapter_id = rc.id
    JOIN public.batch_roadmaps br ON rc.roadmap_id = br.id
    JOIN public.profiles p ON br.batch_id = p.batch_id
    WHERE p.id = auth.uid()
  ));

-- RLS Policies for student_xp_coins
CREATE POLICY "Students can view their own XP and coins"
  ON public.student_xp_coins FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "System can manage XP and coins"
  ON public.student_xp_coins FOR ALL
  USING (true);

CREATE POLICY "Admins can view all XP and coins"
  ON public.student_xp_coins FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for content_modification_history
CREATE POLICY "Admins can view all modification history"
  ON public.content_modification_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can insert modification history"
  ON public.content_modification_history FOR INSERT
  WITH CHECK (true);

-- Function to auto-create XP/Coins record on user signup
CREATE OR REPLACE FUNCTION public.create_student_xp_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.student_xp_coins (student_id)
  VALUES (NEW.id)
  ON CONFLICT (student_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_xp_coins
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_student_xp_coins();