-- Drop and recreate calculate_topic_status function (game completion only)
DROP FUNCTION IF EXISTS public.calculate_topic_status(UUID, UUID);

CREATE OR REPLACE FUNCTION public.calculate_topic_status(p_student_id UUID, p_topic_id UUID)
RETURNS TABLE (
  student_id UUID,
  topic_id UUID,
  status TEXT,
  game_completion_rate DECIMAL,
  test_avg_score DECIMAL,
  total_games INT,
  games_completed INT
) AS $$
DECLARE
  v_game_completion_rate DECIMAL := 0;
  v_test_avg_score DECIMAL := 0;
  v_total_games INT := 0;
  v_games_completed INT := 0;
  v_status TEXT := 'grey';
BEGIN
  -- Get game progress data
  SELECT 
    COALESCE(stgp.questions_completed, 0),
    COALESCE(stgp.total_questions, 0),
    CASE 
      WHEN stgp.total_questions > 0 THEN (stgp.questions_completed::DECIMAL / stgp.total_questions) * 100
      ELSE 0
    END
  INTO v_games_completed, v_total_games, v_game_completion_rate
  FROM student_topic_game_progress stgp
  WHERE stgp.student_id = p_student_id 
    AND stgp.topic_id = p_topic_id;

  -- Test score remains at 0 (not used in status calculation)
  v_test_avg_score := 0;

  -- Determine status PURELY based on game completion rate
  IF v_game_completion_rate >= 60 THEN
    v_status := 'green';
  ELSIF v_game_completion_rate >= 40 THEN
    v_status := 'yellow';
  ELSIF v_game_completion_rate > 0 THEN
    v_status := 'red';
  ELSE
    v_status := 'grey';
  END IF;

  -- Return the calculated values
  RETURN QUERY SELECT 
    p_student_id,
    p_topic_id,
    v_status,
    v_game_completion_rate,
    v_test_avg_score,
    v_total_games,
    v_games_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recalculate all existing topic statuses
DO $$
DECLARE
  rec RECORD;
  calc_result RECORD;
BEGIN
  FOR rec IN 
    SELECT DISTINCT stgp.student_id, stgp.topic_id 
    FROM student_topic_game_progress stgp
  LOOP
    SELECT * INTO calc_result
    FROM calculate_topic_status(rec.student_id, rec.topic_id);
    
    INSERT INTO student_topic_status (
      student_id,
      topic_id,
      status,
      game_completion_rate,
      test_avg_score,
      total_games,
      games_completed,
      updated_at
    ) VALUES (
      calc_result.student_id,
      calc_result.topic_id,
      calc_result.status,
      calc_result.game_completion_rate,
      calc_result.test_avg_score,
      calc_result.total_games,
      calc_result.games_completed,
      NOW()
    )
    ON CONFLICT (student_id, topic_id)
    DO UPDATE SET
      status = calc_result.status,
      game_completion_rate = calc_result.game_completion_rate,
      test_avg_score = calc_result.test_avg_score,
      total_games = calc_result.total_games,
      games_completed = calc_result.games_completed,
      updated_at = NOW();
  END LOOP;
END $$;