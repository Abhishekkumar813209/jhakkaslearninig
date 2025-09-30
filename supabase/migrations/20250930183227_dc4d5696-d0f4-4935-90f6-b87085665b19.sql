-- Create subject_analytics table for tracking subject-wise performance
CREATE TABLE IF NOT EXISTS public.subject_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  tests_taken INTEGER DEFAULT 0,
  average_score NUMERIC DEFAULT 0,
  best_score NUMERIC DEFAULT 0,
  total_marks_obtained INTEGER DEFAULT 0,
  total_marks_possible INTEGER DEFAULT 0,
  subject_rank INTEGER,
  subject_percentile NUMERIC,
  subject_performance_index NUMERIC DEFAULT 0,
  mastery_level TEXT DEFAULT 'beginner' CHECK (mastery_level IN ('beginner', 'intermediate', 'advanced', 'master')),
  last_test_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subject)
);

-- Enable RLS on subject_analytics
ALTER TABLE public.subject_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subject_analytics
CREATE POLICY "Students can view their own subject analytics"
  ON public.subject_analytics FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all subject analytics"
  ON public.subject_analytics FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create achievements table for Hall of Fame
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL CHECK (achievement_type IN ('perfect_scorer', 'speed_demon', 'consistency_king', 'monthly_topper', 'subject_master', 'test_champion')),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  subject TEXT,
  score NUMERIC,
  metadata JSONB DEFAULT '{}',
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements
CREATE POLICY "Students can view their own achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can view all achievements for hall of fame"
  ON public.achievements FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage all achievements"
  ON public.achievements FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create indexes for better performance
CREATE INDEX idx_subject_analytics_student_subject ON public.subject_analytics(student_id, subject);
CREATE INDEX idx_subject_analytics_subject_rank ON public.subject_analytics(subject, subject_rank);
CREATE INDEX idx_achievements_student ON public.achievements(student_id);
CREATE INDEX idx_achievements_type ON public.achievements(achievement_type);
CREATE INDEX idx_test_attempts_test_score ON public.test_attempts(test_id, score DESC);
CREATE INDEX idx_test_attempts_test_time ON public.test_attempts(test_id, time_taken_minutes);

-- Function to update subject analytics after test completion
CREATE OR REPLACE FUNCTION update_subject_analytics_after_test()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_subject TEXT;
  v_test_marks INTEGER;
BEGIN
  IF NEW.status IN ('submitted', 'auto_submitted') THEN
    -- Get test subject and marks
    SELECT subject, total_marks INTO v_subject, v_test_marks
    FROM tests
    WHERE id = NEW.test_id;
    
    -- Update subject analytics
    INSERT INTO subject_analytics (
      student_id,
      subject,
      tests_taken,
      average_score,
      best_score,
      total_marks_obtained,
      total_marks_possible,
      last_test_date
    )
    SELECT
      NEW.student_id,
      v_subject,
      COUNT(*),
      AVG(percentage),
      MAX(percentage),
      SUM(score),
      SUM(total_marks),
      MAX(submitted_at)
    FROM test_attempts ta
    JOIN tests t ON ta.test_id = t.id
    WHERE ta.student_id = NEW.student_id
      AND t.subject = v_subject
      AND ta.status IN ('submitted', 'auto_submitted')
    ON CONFLICT (student_id, subject) DO UPDATE SET
      tests_taken = EXCLUDED.tests_taken,
      average_score = EXCLUDED.average_score,
      best_score = EXCLUDED.best_score,
      total_marks_obtained = EXCLUDED.total_marks_obtained,
      total_marks_possible = EXCLUDED.total_marks_possible,
      last_test_date = EXCLUDED.last_test_date,
      updated_at = NOW();
    
    -- Update mastery level based on performance
    UPDATE subject_analytics
    SET mastery_level = CASE
      WHEN average_score >= 90 AND tests_taken >= 5 THEN 'master'
      WHEN average_score >= 75 AND tests_taken >= 3 THEN 'advanced'
      WHEN average_score >= 60 AND tests_taken >= 2 THEN 'intermediate'
      ELSE 'beginner'
    END,
    subject_performance_index = (average_score * 0.6) + (best_score * 0.3) + (LEAST(tests_taken * 2, 20) * 0.5)
    WHERE student_id = NEW.student_id AND subject = v_subject;
    
    -- Calculate subject rankings
    WITH subject_rankings AS (
      SELECT 
        student_id,
        subject,
        ROW_NUMBER() OVER (PARTITION BY subject ORDER BY subject_performance_index DESC) as rank,
        COUNT(*) OVER (PARTITION BY subject) as total_students
      FROM subject_analytics
      WHERE subject = v_subject
    )
    UPDATE subject_analytics sa
    SET 
      subject_rank = sr.rank,
      subject_percentile = ROUND(((sr.total_students - sr.rank + 1) * 100.0 / sr.total_students), 2)
    FROM subject_rankings sr
    WHERE sa.student_id = sr.student_id AND sa.subject = sr.subject;
    
    -- Check for achievements
    -- Perfect Scorer
    IF NEW.percentage = 100 THEN
      INSERT INTO achievements (student_id, achievement_type, test_id, score, metadata)
      VALUES (NEW.student_id, 'perfect_scorer', NEW.test_id, NEW.score, jsonb_build_object('subject', v_subject))
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Speed Demon (completed in less than 50% of allotted time with >80% score)
    IF NEW.percentage >= 80 AND EXISTS (
      SELECT 1 FROM tests t
      WHERE t.id = NEW.test_id
      AND NEW.time_taken_minutes < (t.duration_minutes * 0.5)
    ) THEN
      INSERT INTO achievements (student_id, achievement_type, test_id, score, metadata)
      VALUES (NEW.student_id, 'speed_demon', NEW.test_id, NEW.score, 
              jsonb_build_object('subject', v_subject, 'time_taken', NEW.time_taken_minutes))
      ON CONFLICT DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for subject analytics
DROP TRIGGER IF EXISTS trigger_update_subject_analytics ON test_attempts;
CREATE TRIGGER trigger_update_subject_analytics
  AFTER INSERT OR UPDATE ON test_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_subject_analytics_after_test();

-- Create view for test-specific leaderboards
CREATE OR REPLACE VIEW test_leaderboards AS
SELECT 
  ta.id,
  ta.test_id,
  ta.student_id,
  p.full_name as student_name,
  p.student_class,
  p.batch_id,
  ta.score,
  ta.percentage,
  ta.time_taken_minutes,
  ta.submitted_at,
  ROW_NUMBER() OVER (PARTITION BY ta.test_id ORDER BY ta.score DESC, ta.time_taken_minutes ASC) as score_rank,
  ROW_NUMBER() OVER (PARTITION BY ta.test_id ORDER BY ta.time_taken_minutes ASC) as speed_rank,
  ROW_NUMBER() OVER (PARTITION BY ta.test_id ORDER BY ta.percentage DESC) as accuracy_rank,
  t.title as test_title,
  t.subject,
  t.total_marks
FROM test_attempts ta
JOIN profiles p ON ta.student_id = p.id
JOIN tests t ON ta.test_id = t.id
WHERE ta.status IN ('submitted', 'auto_submitted')
  AND ta.percentage >= 60; -- Only include attempts with 60%+ for speed rankings