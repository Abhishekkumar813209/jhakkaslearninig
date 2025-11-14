-- Fix topic status color thresholds to match frontend progressColors.ts
-- Frontend uses: >70% = green, 50-70% = grey, <50% = red, 0% = grey

-- Drop existing function to allow return type modification
DROP FUNCTION IF EXISTS public.calculate_topic_status(uuid, uuid);

-- Recreate with updated thresholds
CREATE OR REPLACE FUNCTION public.calculate_topic_status(p_student_id uuid, p_topic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_games INTEGER := 0;
  v_completed_games INTEGER := 0;
  v_game_completion_rate NUMERIC := 0;
  v_status TEXT := 'grey';
  v_total_test_questions INTEGER := 0;
  v_correct_test_answers INTEGER := 0;
  v_test_accuracy NUMERIC := 0;
BEGIN
  -- Count total games for this topic
  SELECT COUNT(DISTINCT ge.id) INTO v_total_games
  FROM gamified_exercises ge
  JOIN topic_content_mapping tcm ON ge.topic_content_id = tcm.id
  WHERE tcm.topic_id = p_topic_id;
  
  -- Count completed games
  SELECT COALESCE(array_length(completed_game_ids, 1), 0) INTO v_completed_games
  FROM student_topic_game_progress
  WHERE student_id = p_student_id AND topic_id = p_topic_id;
  
  -- Calculate game completion rate
  IF v_total_games > 0 THEN
    v_game_completion_rate := (v_completed_games::NUMERIC / v_total_games) * 100;
  END IF;
  
  -- Count test performance for this topic
  SELECT 
    COUNT(*) FILTER (WHERE sqa.question_id IS NOT NULL),
    COUNT(*) FILTER (WHERE sqa.is_correct = true)
  INTO v_total_test_questions, v_correct_test_answers
  FROM student_question_attempts sqa
  JOIN questions q ON sqa.question_id = q.id
  WHERE sqa.student_id = p_student_id 
    AND q.topic_id = p_topic_id;
  
  -- Calculate test accuracy
  IF v_total_test_questions > 0 THEN
    v_test_accuracy := (v_correct_test_answers::NUMERIC / v_total_test_questions) * 100;
  END IF;
  
  -- Determine status based on FRONTEND thresholds (>70% green, 50-70% grey, <50% red)
  IF v_game_completion_rate > 70 THEN
    v_status := 'green';
  ELSIF v_game_completion_rate >= 50 THEN
    v_status := 'grey';
  ELSIF v_game_completion_rate > 0 THEN
    v_status := 'red';
  ELSE
    v_status := 'grey';  -- Not started
  END IF;
  
  -- Insert or update student_topic_status
  INSERT INTO student_topic_status (
    student_id,
    topic_id,
    status,
    game_completion_rate,
    test_accuracy,
    last_updated
  ) VALUES (
    p_student_id,
    p_topic_id,
    v_status,
    v_game_completion_rate,
    v_test_accuracy,
    NOW()
  )
  ON CONFLICT (student_id, topic_id) DO UPDATE SET
    status = EXCLUDED.status,
    game_completion_rate = EXCLUDED.game_completion_rate,
    test_accuracy = EXCLUDED.test_accuracy,
    last_updated = NOW();
END;
$function$;