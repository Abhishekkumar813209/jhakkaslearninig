-- Create lesson content table
CREATE TABLE IF NOT EXISTS public.topic_learning_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.roadmap_topics(id) ON DELETE CASCADE,
  
  -- Content Types
  lesson_type TEXT NOT NULL CHECK (lesson_type IN ('theory', 'interactive_svg', 'game', 'quiz')),
  content_order INTEGER NOT NULL,
  
  -- Theory Content
  theory_text TEXT,
  theory_html TEXT,
  
  -- SVG Animation Config
  svg_type TEXT CHECK (svg_type IN ('math_graph', 'physics_motion', 'chemistry_molecule', 'algorithm_viz', 'concept_diagram')),
  svg_data JSONB,
  interaction_config JSONB,
  
  -- Step-by-step Explanation
  explanation_steps JSONB[],
  
  -- Try It Yourself Config
  playground_config JSONB,
  
  -- Game Content
  game_type TEXT CHECK (game_type IN ('match_pairs', 'drag_drop', 'typing_race', 'word_puzzle', 'fill_blanks', 'sequence_order')),
  game_data JSONB,
  
  -- Metadata
  estimated_time_minutes INTEGER DEFAULT 5,
  xp_reward INTEGER DEFAULT 10,
  coin_reward INTEGER DEFAULT 2,
  
  -- Approval Workflow
  generated_by TEXT DEFAULT 'manual' CHECK (generated_by IN ('manual', 'ai', 'hybrid')),
  created_by UUID REFERENCES public.profiles(id),
  human_reviewed BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create student lesson progress table
CREATE TABLE IF NOT EXISTS public.student_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.roadmap_topics(id) ON DELETE CASCADE,
  lesson_content_id UUID REFERENCES public.topic_learning_content(id) ON DELETE CASCADE,
  
  -- Progress Tracking
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'in_progress', 'completed')),
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER,
  steps_completed INTEGER DEFAULT 0,
  
  -- Interaction Stats
  time_spent_seconds INTEGER DEFAULT 0,
  svg_interactions_count INTEGER DEFAULT 0,
  playground_attempts INTEGER DEFAULT 0,
  playground_completed BOOLEAN DEFAULT FALSE,
  
  -- Game Stats
  game_score INTEGER DEFAULT 0,
  game_completed BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, lesson_content_id)
);

-- Create hearts system table
CREATE TABLE IF NOT EXISTS public.student_hearts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  current_hearts INTEGER DEFAULT 5 CHECK (current_hearts >= 0 AND current_hearts <= max_hearts),
  max_hearts INTEGER DEFAULT 5,
  last_heart_lost_at TIMESTAMPTZ,
  last_heart_refill_at TIMESTAMPTZ,
  hearts_refill_rate INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quests table
CREATE TABLE IF NOT EXISTS public.student_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('daily', 'weekly')),
  quest_name TEXT NOT NULL,
  quest_description TEXT,
  
  -- Quest Objectives
  target_type TEXT CHECK (target_type IN ('xp_earned', 'lessons_completed', 'streak_maintained', 'games_played', 'topics_completed')),
  target_value INTEGER,
  current_progress INTEGER DEFAULT 0,
  
  -- Rewards
  xp_reward INTEGER DEFAULT 50,
  coin_reward INTEGER DEFAULT 10,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  badge_icon TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, achievement_type)
);

-- Create leagues table
CREATE TABLE IF NOT EXISTS public.student_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  league_tier TEXT DEFAULT 'bronze' CHECK (league_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  weekly_xp INTEGER DEFAULT 0,
  rank_in_league INTEGER,
  league_week_start DATE,
  league_week_end DATE,
  promoted BOOLEAN DEFAULT FALSE,
  demoted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.topic_learning_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_hearts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_leagues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for topic_learning_content
CREATE POLICY "Admins can manage all lesson content"
  ON public.topic_learning_content
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view approved content for their roadmap"
  ON public.topic_learning_content
  FOR SELECT
  USING (
    human_reviewed = true 
    AND approved_at IS NOT NULL
    AND topic_id IN (
      SELECT rt.id 
      FROM roadmap_topics rt
      JOIN roadmap_chapters rc ON rt.chapter_id = rc.id
      JOIN batch_roadmaps br ON rc.roadmap_id = br.id
      JOIN profiles p ON br.batch_id = p.batch_id
      WHERE p.id = auth.uid()
    )
  );

-- RLS Policies for student_lesson_progress
CREATE POLICY "Students can manage their own progress"
  ON public.student_lesson_progress
  FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can view all progress"
  ON public.student_lesson_progress
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for student_hearts
CREATE POLICY "Students can view their own hearts"
  ON public.student_hearts
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can update their own hearts"
  ON public.student_hearts
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can manage all hearts"
  ON public.student_hearts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can insert hearts"
  ON public.student_hearts
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for student_quests
CREATE POLICY "Students can view their own quests"
  ON public.student_quests
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can update their quest progress"
  ON public.student_quests
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can manage all quests"
  ON public.student_quests
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for student_achievements
CREATE POLICY "Students can view their own achievements"
  ON public.student_achievements
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins can manage all achievements"
  ON public.student_achievements
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can award achievements"
  ON public.student_achievements
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for student_leagues
CREATE POLICY "Students can view their own league"
  ON public.student_leagues
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can view league leaderboard"
  ON public.student_leagues
  FOR SELECT
  USING (
    league_week_start = (
      SELECT league_week_start 
      FROM student_leagues 
      WHERE student_id = auth.uid() 
      LIMIT 1
    )
  );

CREATE POLICY "Admins can manage all leagues"
  ON public.student_leagues
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Trigger to auto-create hearts for new students
CREATE OR REPLACE FUNCTION create_student_hearts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.student_hearts (student_id)
  VALUES (NEW.id)
  ON CONFLICT (student_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_hearts
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_student_hearts();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_topic_learning_content_updated_at
  BEFORE UPDATE ON public.topic_learning_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_student_hearts_updated_at
  BEFORE UPDATE ON public.student_hearts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_student_leagues_updated_at
  BEFORE UPDATE ON public.student_leagues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to refill hearts over time
CREATE OR REPLACE FUNCTION refill_hearts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_hearts
  SET 
    current_hearts = LEAST(
      max_hearts,
      current_hearts + (
        EXTRACT(EPOCH FROM (NOW() - COALESCE(last_heart_refill_at, NOW()))) / 3600
      )::INTEGER * hearts_refill_rate
    ),
    last_heart_refill_at = NOW()
  WHERE current_hearts < max_hearts
    AND (last_heart_refill_at IS NULL OR NOW() - last_heart_refill_at >= INTERVAL '1 hour');
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_topic_learning_content_topic_id ON public.topic_learning_content(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_learning_content_approved ON public.topic_learning_content(human_reviewed, approved_at) WHERE human_reviewed = true;
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_student ON public.student_lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_topic ON public.student_lesson_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_student_quests_student_active ON public.student_quests(student_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_student_leagues_week ON public.student_leagues(league_week_start, league_week_end);