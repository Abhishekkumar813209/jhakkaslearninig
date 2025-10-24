-- Step 1: Create audit logging table
CREATE TABLE IF NOT EXISTS public.content_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_item_type TEXT NOT NULL,
  deleted_item_id UUID NOT NULL,
  deleted_item_data JSONB NOT NULL,
  deletion_reason TEXT,
  affected_students_count INTEGER DEFAULT 0,
  affected_attempts_count INTEGER DEFAULT 0,
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_deletion_log_type_date 
  ON public.content_deletion_log(deleted_item_type, deleted_at DESC);

-- Step 2: Cleanup function for gamified_exercises deletion
CREATE OR REPLACE FUNCTION public.cleanup_student_progress_on_game_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_affected_students INTEGER := 0;
  v_affected_attempts INTEGER := 0;
BEGIN
  -- Count affected records for audit
  SELECT COUNT(DISTINCT student_id) INTO v_affected_students
  FROM public.student_topic_game_progress
  WHERE OLD.id = ANY(completed_game_ids);
  
  SELECT COUNT(*) INTO v_affected_attempts
  FROM public.student_question_attempts
  WHERE game_id = OLD.id;
  
  -- Remove deleted game_id from all completed_game_ids arrays
  UPDATE public.student_topic_game_progress
  SET 
    completed_game_ids = array_remove(completed_game_ids, OLD.id),
    questions_completed = GREATEST(0, questions_completed - 1),
    session_state = CASE
      WHEN session_state ? 'currentGameId' AND (session_state->>'currentGameId')::UUID = OLD.id
      THEN session_state - 'currentGameId'
      ELSE session_state
    END,
    updated_at = NOW()
  WHERE OLD.id = ANY(completed_game_ids);
  
  -- Log the deletion with metrics
  INSERT INTO public.content_deletion_log (
    deleted_item_type,
    deleted_item_id,
    deleted_item_data,
    affected_students_count,
    affected_attempts_count,
    deleted_by,
    metadata
  ) VALUES (
    'gamified_exercise',
    OLD.id,
    to_jsonb(OLD),
    v_affected_students,
    v_affected_attempts,
    auth.uid(),
    jsonb_build_object(
      'topic_content_id', OLD.topic_content_id,
      'exercise_type', OLD.exercise_type,
      'difficulty', OLD.difficulty,
      'xp_reward', OLD.xp_reward,
      'game_order', OLD.game_order
    )
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Cascade handler for topic_learning_content deletion
CREATE OR REPLACE FUNCTION public.cleanup_gamified_exercises_on_lesson_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_mapping_id UUID;
  v_deleted_games INTEGER := 0;
  v_total_affected_students INTEGER := 0;
BEGIN
  -- Only process if this is a game-type lesson that was approved
  IF OLD.lesson_type = 'game' AND OLD.human_reviewed = true THEN
    
    -- Find the topic_content_mapping entry
    SELECT id INTO v_mapping_id
    FROM public.topic_content_mapping
    WHERE topic_id = OLD.topic_id 
      AND content_type = 'theory'
    LIMIT 1;
    
    IF v_mapping_id IS NOT NULL THEN
      -- Count games before deletion
      SELECT COUNT(*) INTO v_deleted_games
      FROM public.gamified_exercises
      WHERE topic_content_id = v_mapping_id;
      
      -- Count total affected students
      SELECT COUNT(DISTINCT student_id) INTO v_total_affected_students
      FROM public.student_topic_game_progress stgp
      WHERE EXISTS (
        SELECT 1 FROM public.gamified_exercises ge
        WHERE ge.topic_content_id = v_mapping_id
          AND ge.id = ANY(stgp.completed_game_ids)
      );
      
      -- Delete gamified exercises (triggers cleanup_student_progress_on_game_delete)
      DELETE FROM public.gamified_exercises
      WHERE topic_content_id = v_mapping_id;
      
      -- Log the cascade deletion
      INSERT INTO public.content_deletion_log (
        deleted_item_type,
        deleted_item_id,
        deleted_item_data,
        deletion_reason,
        affected_students_count,
        deleted_by,
        metadata
      ) VALUES (
        'topic_learning_content',
        OLD.id,
        to_jsonb(OLD),
        'Parent lesson deleted - cascaded to gamified_exercises',
        v_total_affected_students,
        auth.uid(),
        jsonb_build_object(
          'lesson_type', OLD.lesson_type,
          'topic_id', OLD.topic_id,
          'games_deleted_count', v_deleted_games,
          'was_human_reviewed', OLD.human_reviewed
        )
      );
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 4: Impact preview function
CREATE OR REPLACE FUNCTION public.check_lesson_deletion_impact(p_lesson_id UUID)
RETURNS TABLE(
  lesson_type TEXT,
  games_count INTEGER,
  affected_students INTEGER,
  total_attempts INTEGER,
  estimated_lost_progress TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tlc.lesson_type,
    COALESCE(game_counts.games, 0)::INTEGER AS games_count,
    COALESCE(student_counts.students, 0)::INTEGER AS affected_students,
    COALESCE(attempt_counts.attempts, 0)::INTEGER AS total_attempts,
    CASE 
      WHEN COALESCE(student_counts.students, 0) > 0 
      THEN format('%s students will lose %s completed games', 
                   student_counts.students, 
                   game_counts.games)
      ELSE 'No student progress affected'
    END AS estimated_lost_progress
  FROM public.topic_learning_content tlc
  LEFT JOIN (
    SELECT COUNT(*)::INTEGER AS games
    FROM public.gamified_exercises ge
    JOIN public.topic_content_mapping tcm ON ge.topic_content_id = tcm.id
    WHERE tcm.topic_id = (SELECT topic_id FROM public.topic_learning_content WHERE id = p_lesson_id)
  ) game_counts ON true
  LEFT JOIN (
    SELECT COUNT(DISTINCT student_id)::INTEGER AS students
    FROM public.student_topic_game_progress stgp
    WHERE EXISTS (
      SELECT 1 FROM public.gamified_exercises ge
      JOIN public.topic_content_mapping tcm ON ge.topic_content_id = tcm.id
      WHERE tcm.topic_id = (SELECT topic_id FROM public.topic_learning_content WHERE id = p_lesson_id)
        AND ge.id = ANY(stgp.completed_game_ids)
    )
  ) student_counts ON true
  LEFT JOIN (
    SELECT COUNT(*)::INTEGER AS attempts
    FROM public.student_question_attempts sqa
    WHERE sqa.game_id IN (
      SELECT ge.id FROM public.gamified_exercises ge
      JOIN public.topic_content_mapping tcm ON ge.topic_content_id = tcm.id
      WHERE tcm.topic_id = (SELECT topic_id FROM public.topic_learning_content WHERE id = p_lesson_id)
    )
  ) attempt_counts ON true
  WHERE tlc.id = p_lesson_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 5: Attach triggers
DROP TRIGGER IF EXISTS trigger_cleanup_game_progress ON public.gamified_exercises;
CREATE TRIGGER trigger_cleanup_game_progress
  BEFORE DELETE ON public.gamified_exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_student_progress_on_game_delete();

DROP TRIGGER IF EXISTS trigger_cascade_lesson_to_games ON public.topic_learning_content;
CREATE TRIGGER trigger_cascade_lesson_to_games
  BEFORE DELETE ON public.topic_learning_content
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_gamified_exercises_on_lesson_delete();

-- Step 6: Enable RLS on content_deletion_log
ALTER TABLE public.content_deletion_log ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all deletion logs
CREATE POLICY "Admins can view all deletion logs"
  ON public.content_deletion_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- System can insert deletion logs (via triggers)
CREATE POLICY "System can insert deletion logs"
  ON public.content_deletion_log
  FOR INSERT
  WITH CHECK (true);