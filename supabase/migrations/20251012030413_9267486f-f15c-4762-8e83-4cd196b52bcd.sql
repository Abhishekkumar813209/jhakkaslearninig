-- Create student_daily_targets table
CREATE TABLE IF NOT EXISTS public.student_daily_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  target_topics TEXT[] DEFAULT '{}',
  completed_topics TEXT[] DEFAULT '{}',
  target_tests UUID[] DEFAULT '{}',
  completed_tests UUID[] DEFAULT '{}',
  target_xp INTEGER DEFAULT 50,
  earned_xp INTEGER DEFAULT 0,
  completion_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Create student_topic_analytics table
CREATE TABLE IF NOT EXISTS public.student_topic_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.roadmap_topics(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  times_practiced INTEGER DEFAULT 0,
  average_score NUMERIC DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  mastery_level TEXT DEFAULT 'beginner' CHECK (mastery_level IN ('beginner', 'intermediate', 'advanced', 'master')),
  last_practiced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, topic_id)
);

-- Create student_zone_status table
CREATE TABLE IF NOT EXISTS public.student_zone_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  zone_color TEXT NOT NULL DEFAULT 'yellow' CHECK (zone_color IN ('green', 'yellow', 'red')),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  factors JSONB DEFAULT '{}',
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_daily_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_topic_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_zone_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_daily_targets
CREATE POLICY "Students can view their own daily targets"
  ON public.student_daily_targets FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can manage their own daily targets"
  ON public.student_daily_targets FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all daily targets"
  ON public.student_daily_targets FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Parents can view linked students daily targets"
  ON public.student_daily_targets FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM parent_student_links WHERE parent_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::user_role)
  );

-- RLS Policies for student_topic_analytics
CREATE POLICY "Students can view their own topic analytics"
  ON public.student_topic_analytics FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can manage their own topic analytics"
  ON public.student_topic_analytics FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all topic analytics"
  ON public.student_topic_analytics FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Parents can view linked students topic analytics"
  ON public.student_topic_analytics FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM parent_student_links WHERE parent_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::user_role)
  );

-- RLS Policies for student_zone_status
CREATE POLICY "Students can view their own zone status"
  ON public.student_zone_status FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "System can manage zone status"
  ON public.student_zone_status FOR ALL
  USING (true);

CREATE POLICY "Admins can view all zone status"
  ON public.student_zone_status FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Parents can view linked students zone status"
  ON public.student_zone_status FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM parent_student_links WHERE parent_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::user_role)
  );

-- Create function to calculate student zone
CREATE OR REPLACE FUNCTION public.calculate_student_zone(p_student_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_completion NUMERIC := 0;
  v_avg_score NUMERIC := 0;
  v_mastery_percentage NUMERIC := 0;
  v_zone_color TEXT := 'yellow';
  v_factors JSONB;
  v_recommendation TEXT;
BEGIN
  -- Calculate daily target completion rate (last 7 days)
  SELECT COALESCE(AVG(completion_percentage), 0)
  INTO v_target_completion
  FROM student_daily_targets
  WHERE student_id = p_student_id
    AND date >= CURRENT_DATE - INTERVAL '7 days';

  -- Calculate average test scores (last 2 weeks)
  SELECT COALESCE(AVG(percentage), 0)
  INTO v_avg_score
  FROM test_attempts
  WHERE student_id = p_student_id
    AND submitted_at >= NOW() - INTERVAL '14 days'
    AND status IN ('submitted', 'auto_submitted');

  -- Calculate topic mastery percentage
  SELECT COALESCE(
    (COUNT(*) FILTER (WHERE mastery_level IN ('advanced', 'master'))::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    0
  )
  INTO v_mastery_percentage
  FROM student_topic_analytics
  WHERE student_id = p_student_id;

  -- Determine zone color based on criteria
  IF v_target_completion >= 80 AND v_avg_score >= 75 AND v_mastery_percentage >= 60 THEN
    v_zone_color := 'green';
    v_recommendation := 'Excellent progress! Keep maintaining this momentum. Focus on challenging topics to stay sharp.';
  ELSIF v_target_completion >= 50 AND v_avg_score >= 50 AND v_mastery_percentage >= 35 THEN
    v_zone_color := 'yellow';
    v_recommendation := 'Good effort! Increase daily practice time and focus on weak subjects to move to green zone.';
  ELSE
    v_zone_color := 'red';
    v_recommendation := 'Immediate attention needed! Set smaller daily goals, practice consistently, and seek help on difficult topics.';
  END IF;

  -- Build factors JSON
  v_factors := jsonb_build_object(
    'daily_target_completion', ROUND(v_target_completion, 2),
    'weekly_avg_score', ROUND(v_avg_score, 2),
    'topic_mastery_percentage', ROUND(v_mastery_percentage, 2),
    'expected_pass_probability', ROUND((v_target_completion * 0.3 + v_avg_score * 0.5 + v_mastery_percentage * 0.2), 2)
  );

  -- Insert or update zone status
  INSERT INTO student_zone_status (student_id, zone_color, factors, recommendation, calculated_at)
  VALUES (p_student_id, v_zone_color, v_factors, v_recommendation, NOW())
  ON CONFLICT (student_id) DO UPDATE SET
    zone_color = EXCLUDED.zone_color,
    factors = EXCLUDED.factors,
    recommendation = EXCLUDED.recommendation,
    calculated_at = NOW(),
    updated_at = NOW();

  RETURN v_zone_color;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_targets_student_date ON public.student_daily_targets(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_topic_analytics_student ON public.student_topic_analytics(student_id);
CREATE INDEX IF NOT EXISTS idx_zone_status_student ON public.student_zone_status(student_id);

-- Add trigger to update updated_at
CREATE TRIGGER update_daily_targets_updated_at
  BEFORE UPDATE ON public.student_daily_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_topic_analytics_updated_at
  BEFORE UPDATE ON public.student_topic_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_zone_status_updated_at
  BEFORE UPDATE ON public.student_zone_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();