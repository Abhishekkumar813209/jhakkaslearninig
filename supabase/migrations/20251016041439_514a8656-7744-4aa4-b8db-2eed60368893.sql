-- Phase 1.1: Add xp_awarded tracking to student_question_attempts
ALTER TABLE public.student_question_attempts 
ADD COLUMN IF NOT EXISTS xp_awarded BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_student_attempts_xp 
ON public.student_question_attempts(student_id, question_id, xp_awarded);

-- Phase 1.2: Add completed_game_ids to student_topic_game_progress
ALTER TABLE public.student_topic_game_progress 
ADD COLUMN IF NOT EXISTS completed_game_ids UUID[] DEFAULT ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_topic_progress_completed_games 
ON public.student_topic_game_progress USING GIN(completed_game_ids);

-- Phase 1.3: Add helper function to check topic completion
CREATE OR REPLACE FUNCTION is_topic_fully_completed(p_student_id UUID, p_topic_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  total_games INTEGER;
  completed_games INTEGER;
BEGIN
  -- Count total games in topic
  SELECT COUNT(*) INTO total_games
  FROM gamified_exercises
  WHERE topic_content_id IN (
    SELECT id FROM topic_content_mapping WHERE topic_id = p_topic_id
  );
  
  -- Count completed games
  SELECT COALESCE(array_length(completed_game_ids, 1), 0) INTO completed_games
  FROM student_topic_game_progress
  WHERE student_id = p_student_id AND topic_id = p_topic_id;
  
  RETURN (completed_games >= total_games AND total_games > 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Phase 7: Create RPC function for XP increment
CREATE OR REPLACE FUNCTION increment_student_xp(
  student_id UUID,
  xp_amount INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET 
    xp = COALESCE(xp, 0) + xp_amount,
    total_xp = COALESCE(total_xp, 0) + xp_amount,
    updated_at = NOW()
  WHERE id = student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;