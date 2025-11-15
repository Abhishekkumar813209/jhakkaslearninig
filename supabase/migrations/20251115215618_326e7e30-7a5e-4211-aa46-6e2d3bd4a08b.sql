-- Fix calculate_topic_status to save games_completed and total_games
-- This fixes the 1100% bug where games_completed=11 and total_games=1

DROP FUNCTION IF EXISTS public.calculate_topic_status(uuid, uuid);

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
  v_test_avg_score NUMERIC := 0;
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
  
  -- Validation: ensure completed <= total
  v_completed_games := LEAST(v_completed_games, v_total_games);
  
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
    v_test_avg_score := (v_correct_test_answers::NUMERIC / v_total_test_questions) * 100;
  END IF;
  
  -- Determine status based on thresholds (>70% green, 50-70% grey, <50% red)
  IF v_game_completion_rate > 70 THEN
    v_status := 'green';
  ELSIF v_game_completion_rate >= 50 THEN
    v_status := 'grey';
  ELSIF v_game_completion_rate > 0 THEN
    v_status := 'red';
  ELSE
    v_status := 'grey';  -- Not started
  END IF;
  
  -- Insert or update student_topic_status (NOW INCLUDES games_completed and total_games)
  INSERT INTO student_topic_status (
    student_id,
    topic_id,
    status,
    game_completion_rate,
    test_avg_score,
    games_completed,
    total_games,
    calculated_at,
    updated_at
  ) VALUES (
    p_student_id,
    p_topic_id,
    v_status,
    v_game_completion_rate,
    v_test_avg_score,
    v_completed_games,
    v_total_games,
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, topic_id) DO UPDATE SET
    status = EXCLUDED.status,
    game_completion_rate = EXCLUDED.game_completion_rate,
    test_avg_score = EXCLUDED.test_avg_score,
    games_completed = EXCLUDED.games_completed,
    total_games = EXCLUDED.total_games,
    calculated_at = NOW(),
    updated_at = NOW();
END;
$function$;

-- Recalculate all existing topic statuses to fix corrupted data
DO $$
DECLARE
  rec RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR rec IN 
    SELECT DISTINCT student_id, topic_id 
    FROM student_topic_status 
    WHERE games_completed IS NULL 
       OR total_games IS NULL 
       OR games_completed > total_games
       OR game_completion_rate > 100
  LOOP
    PERFORM calculate_topic_status(rec.student_id, rec.topic_id);
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Recalculated % topic statuses', v_count;
END $$;