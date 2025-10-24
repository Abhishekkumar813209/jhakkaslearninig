-- Fix game_id column error in cascade cleanup functions
-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_cleanup_game_progress ON gamified_exercises;
DROP TRIGGER IF EXISTS trigger_cascade_lesson_to_games ON topic_learning_content;

-- Drop existing functions
DROP FUNCTION IF EXISTS cleanup_student_progress_on_game_delete();
DROP FUNCTION IF EXISTS cleanup_gamified_exercises_on_lesson_delete();
DROP FUNCTION IF EXISTS check_lesson_deletion_impact(UUID);

-- Recreate cleanup_student_progress_on_game_delete WITHOUT game_id references
CREATE OR REPLACE FUNCTION public.cleanup_student_progress_on_game_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_affected_students INTEGER := 0;
BEGIN
  -- Count affected records for audit
  SELECT COUNT(DISTINCT student_id) INTO v_affected_students
  FROM public.student_topic_game_progress
  WHERE OLD.id = ANY(completed_game_ids);
  
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
  
  -- Log the deletion with metrics (without attempt count since game_id doesn't exist in student_question_attempts)
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
    0, -- Cannot count attempts without game_id column
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
$$;

-- Recreate cleanup_gamified_exercises_on_lesson_delete WITHOUT game_id references
CREATE OR REPLACE FUNCTION public.cleanup_gamified_exercises_on_lesson_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      
      -- Log the cascade deletion (without attempt count)
      INSERT INTO public.content_deletion_log (
        deleted_item_type,
        deleted_item_id,
        deleted_item_data,
        deletion_reason,
        affected_students_count,
        affected_attempts_count,
        deleted_by,
        metadata
      ) VALUES (
        'topic_learning_content',
        OLD.id,
        to_jsonb(OLD),
        'Parent lesson deleted - cascading to linked games',
        v_total_affected_students,
        0, -- Cannot count attempts without game_id column
        auth.uid(),
        jsonb_build_object(
          'lesson_type', OLD.lesson_type,
          'human_reviewed', OLD.human_reviewed,
          'deleted_games_count', v_deleted_games,
          'topic_id', OLD.topic_id,
          'topic_content_mapping_id', v_mapping_id
        )
      );
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Recreate check_lesson_deletion_impact WITHOUT game_id references
CREATE OR REPLACE FUNCTION public.check_lesson_deletion_impact(lesson_id UUID)
RETURNS TABLE(
  games_to_delete INTEGER,
  students_affected INTEGER,
  total_attempts INTEGER,
  impact_summary JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lesson RECORD;
  v_mapping_id UUID;
  v_games_count INTEGER := 0;
  v_students_count INTEGER := 0;
BEGIN
  -- Get lesson details
  SELECT * INTO v_lesson
  FROM public.topic_learning_content
  WHERE id = lesson_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson not found: %', lesson_id;
  END IF;
  
  -- Only calculate impact for game-type approved lessons
  IF v_lesson.lesson_type = 'game' AND v_lesson.human_reviewed = true THEN
    
    -- Find mapping
    SELECT id INTO v_mapping_id
    FROM public.topic_content_mapping
    WHERE topic_id = v_lesson.topic_id 
      AND content_type = 'theory'
    LIMIT 1;
    
    IF v_mapping_id IS NOT NULL THEN
      -- Count games
      SELECT COUNT(*) INTO v_games_count
      FROM public.gamified_exercises
      WHERE topic_content_id = v_mapping_id;
      
      -- Count affected students
      SELECT COUNT(DISTINCT student_id) INTO v_students_count
      FROM public.student_topic_game_progress stgp
      WHERE EXISTS (
        SELECT 1 FROM public.gamified_exercises ge
        WHERE ge.topic_content_id = v_mapping_id
          AND ge.id = ANY(stgp.completed_game_ids)
      );
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    v_games_count,
    v_students_count,
    0, -- Cannot count attempts without game_id column
    jsonb_build_object(
      'lesson_type', v_lesson.lesson_type,
      'human_reviewed', v_lesson.human_reviewed,
      'topic_id', v_lesson.topic_id,
      'will_cascade', (v_lesson.lesson_type = 'game' AND v_lesson.human_reviewed = true),
      'note', 'Attempt count unavailable - student_question_attempts table does not have game_id column'
    );
END;
$$;

-- Recreate triggers
CREATE TRIGGER trigger_cleanup_game_progress
  BEFORE DELETE ON public.gamified_exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_student_progress_on_game_delete();

CREATE TRIGGER trigger_cascade_lesson_to_games
  BEFORE DELETE ON public.topic_learning_content
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_gamified_exercises_on_lesson_delete();