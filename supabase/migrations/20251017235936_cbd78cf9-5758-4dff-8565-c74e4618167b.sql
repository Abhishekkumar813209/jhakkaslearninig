-- Create student_topic_status table for automatic status tracking
CREATE TABLE IF NOT EXISTS public.student_topic_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.roadmap_topics(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.roadmap_chapters(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('green', 'yellow', 'red', 'grey')) DEFAULT 'grey',
  game_completion_rate NUMERIC DEFAULT 0,
  test_avg_score NUMERIC DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,
  games_completed INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, topic_id)
);

-- Enable RLS
ALTER TABLE public.student_topic_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own topic status"
  ON public.student_topic_status
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Parents can view linked students topic status"
  ON public.student_topic_status
  FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM parent_student_links WHERE parent_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::user_role)
  );

CREATE POLICY "System can manage topic status"
  ON public.student_topic_status
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to calculate topic status
CREATE OR REPLACE FUNCTION public.calculate_topic_status(
  p_student_id UUID,
  p_topic_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_game_completion_rate NUMERIC := 0;
  v_test_avg_score NUMERIC := 0;
  v_status TEXT := 'grey';
  v_games_completed INTEGER := 0;
  v_total_games INTEGER := 0;
  v_chapter_id UUID;
BEGIN
  -- Get chapter_id for this topic
  SELECT chapter_id INTO v_chapter_id
  FROM roadmap_topics
  WHERE id = p_topic_id;

  -- Calculate game completion rate
  SELECT 
    COALESCE(questions_completed, 0),
    COALESCE(total_questions, 1),
    COALESCE((questions_completed::NUMERIC / NULLIF(total_questions, 0)) * 100, 0)
  INTO v_games_completed, v_total_games, v_game_completion_rate
  FROM student_topic_game_progress
  WHERE student_id = p_student_id AND topic_id = p_topic_id;
  
  -- Calculate average test score for this topic
  SELECT COALESCE(AVG(ta.percentage), 0)
  INTO v_test_avg_score
  FROM test_attempts ta
  JOIN questions q ON q.test_id = ta.test_id
  WHERE ta.student_id = p_student_id 
    AND q.topic_id = p_topic_id
    AND ta.status IN ('submitted', 'auto_submitted');
  
  -- Determine status based on 60% threshold for both games and tests
  IF v_game_completion_rate >= 60 AND v_test_avg_score >= 60 THEN
    v_status := 'green';
  ELSIF v_game_completion_rate < 40 OR v_test_avg_score < 40 THEN
    v_status := 'red';
  ELSIF v_game_completion_rate > 0 OR v_test_avg_score > 0 THEN
    v_status := 'yellow';
  ELSE
    v_status := 'grey';
  END IF;
  
  -- Upsert into student_topic_status
  INSERT INTO student_topic_status (
    student_id, 
    topic_id, 
    chapter_id,
    status, 
    game_completion_rate, 
    test_avg_score,
    games_completed,
    total_games,
    calculated_at,
    updated_at
  )
  VALUES (
    p_student_id,
    p_topic_id,
    v_chapter_id,
    v_status,
    v_game_completion_rate,
    v_test_avg_score,
    v_games_completed,
    v_total_games,
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, topic_id) DO UPDATE
  SET 
    status = EXCLUDED.status,
    game_completion_rate = EXCLUDED.game_completion_rate,
    test_avg_score = EXCLUDED.test_avg_score,
    games_completed = EXCLUDED.games_completed,
    total_games = EXCLUDED.total_games,
    calculated_at = NOW(),
    updated_at = NOW();
  
  RETURN v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger function to auto-update topic status
CREATE OR REPLACE FUNCTION public.update_topic_status_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_topic_id UUID;
BEGIN
  -- Determine topic_id based on trigger source
  IF TG_TABLE_NAME = 'student_topic_game_progress' THEN
    v_topic_id := NEW.topic_id;
  ELSIF TG_TABLE_NAME = 'test_attempts' THEN
    -- Get all topics from the test questions
    FOR v_topic_id IN 
      SELECT DISTINCT q.topic_id 
      FROM questions q 
      WHERE q.test_id = NEW.test_id AND q.topic_id IS NOT NULL
    LOOP
      PERFORM calculate_topic_status(NEW.student_id, v_topic_id);
    END LOOP;
    RETURN NEW;
  END IF;
  
  IF v_topic_id IS NOT NULL THEN
    PERFORM calculate_topic_status(NEW.student_id, v_topic_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS update_status_on_game_progress ON student_topic_game_progress;
CREATE TRIGGER update_status_on_game_progress
AFTER INSERT OR UPDATE ON student_topic_game_progress
FOR EACH ROW EXECUTE FUNCTION update_topic_status_trigger();

DROP TRIGGER IF EXISTS update_status_on_test_submit ON test_attempts;
CREATE TRIGGER update_status_on_test_submit
AFTER INSERT OR UPDATE ON test_attempts
FOR EACH ROW 
WHEN (NEW.status IN ('submitted', 'auto_submitted'))
EXECUTE FUNCTION update_topic_status_trigger();

-- Create function to calculate subject-wise scores
CREATE OR REPLACE FUNCTION public.calculate_subject_scores(p_student_id UUID)
RETURNS TABLE(
  subject TEXT,
  overall_score NUMERIC,
  test_score NUMERIC,
  topic_mastery NUMERIC,
  game_completion NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(sa.subject, 'Unknown') as subject,
    ROUND(
      COALESCE(sa.average_score, 0) * 0.5 +
      COALESCE(topic_mastery_avg.avg_mastery, 0) * 0.3 +
      COALESCE(game_completion_avg.avg_completion, 0) * 0.2,
      2
    ) as overall_score,
    ROUND(COALESCE(sa.average_score, 0), 2) as test_score,
    ROUND(COALESCE(topic_mastery_avg.avg_mastery, 0), 2) as topic_mastery,
    ROUND(COALESCE(game_completion_avg.avg_completion, 0), 2) as game_completion
  FROM subject_analytics sa
  LEFT JOIN (
    SELECT 
      rt.subject,
      AVG(
        CASE sta.mastery_level
          WHEN 'master' THEN 100
          WHEN 'advanced' THEN 75
          WHEN 'intermediate' THEN 50
          ELSE 25
        END
      ) as avg_mastery
    FROM student_topic_analytics sta
    JOIN roadmap_topics rt ON sta.topic_id = rt.id
    WHERE sta.student_id = p_student_id
    GROUP BY rt.subject
  ) topic_mastery_avg ON sa.subject = topic_mastery_avg.subject
  LEFT JOIN (
    SELECT 
      rt.subject,
      AVG(
        COALESCE(
          (stgp.questions_completed::NUMERIC / NULLIF(stgp.total_questions, 0)) * 100,
          0
        )
      ) as avg_completion
    FROM student_topic_game_progress stgp
    JOIN roadmap_topics rt ON stgp.topic_id = rt.id
    WHERE stgp.student_id = p_student_id
    GROUP BY rt.subject
  ) game_completion_avg ON sa.subject = game_completion_avg.subject
  WHERE sa.student_id = p_student_id
  ORDER BY overall_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_student_topic_status_student ON student_topic_status(student_id);
CREATE INDEX IF NOT EXISTS idx_student_topic_status_topic ON student_topic_status(topic_id);
CREATE INDEX IF NOT EXISTS idx_student_topic_status_chapter ON student_topic_status(chapter_id);

-- Enable realtime for student_topic_status
ALTER PUBLICATION supabase_realtime ADD TABLE student_topic_status;