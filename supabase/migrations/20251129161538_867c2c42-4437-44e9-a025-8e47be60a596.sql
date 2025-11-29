-- Drop and recreate calculate_topic_status function to use batch_question_assignments
DROP FUNCTION IF EXISTS calculate_topic_status(UUID, UUID);

CREATE OR REPLACE FUNCTION calculate_topic_status(
  p_student_id UUID,
  p_topic_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_batch_id UUID;
  v_chapter_id UUID;
  v_total_games INT := 0;
  v_games_completed INT := 0;
  v_completion_rate NUMERIC := 0;
  v_status TEXT := 'grey';
  v_result JSONB;
BEGIN
  -- Get student's batch_id
  SELECT batch_id INTO v_student_batch_id
  FROM profiles
  WHERE id = p_student_id;

  -- Get chapter_id for this topic
  SELECT chapter_id INTO v_chapter_id
  FROM roadmap_topics
  WHERE id = p_topic_id;

  -- Count total games from batch_question_assignments for this topic
  SELECT COUNT(DISTINCT bqa.id) INTO v_total_games
  FROM batch_question_assignments bqa
  WHERE bqa.roadmap_topic_id = p_topic_id
    AND bqa.batch_id = v_student_batch_id
    AND bqa.is_active = true;

  -- Count completed games from student_topic_game_progress
  SELECT 
    COALESCE(array_length(stgp.completed_game_ids, 1), 0)
  INTO v_games_completed
  FROM student_topic_game_progress stgp
  WHERE stgp.student_id = p_student_id
    AND stgp.topic_id = p_topic_id;

  -- Calculate completion rate
  IF v_total_games > 0 THEN
    v_completion_rate := ROUND((v_games_completed::NUMERIC / v_total_games::NUMERIC) * 100, 2);
  END IF;

  -- Determine color-based status
  IF v_games_completed = 0 THEN
    v_status := 'grey';  -- not started
  ELSIF v_games_completed >= v_total_games THEN
    v_status := 'green';  -- completed
  ELSIF v_completion_rate >= 50 THEN
    v_status := 'yellow';  -- in progress (good)
  ELSE
    v_status := 'red';  -- in progress (needs attention)
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'student_id', p_student_id,
    'topic_id', p_topic_id,
    'chapter_id', v_chapter_id,
    'total_games', v_total_games,
    'games_completed', v_games_completed,
    'game_completion_rate', v_completion_rate,
    'status', v_status,
    'calculated_at', NOW()
  );

  -- Upsert into student_topic_status
  INSERT INTO student_topic_status (
    student_id,
    topic_id,
    chapter_id,
    total_games,
    games_completed,
    game_completion_rate,
    status,
    calculated_at
  )
  VALUES (
    p_student_id,
    p_topic_id,
    v_chapter_id,
    v_total_games,
    v_games_completed,
    v_completion_rate,
    v_status,
    NOW()
  )
  ON CONFLICT (student_id, topic_id)
  DO UPDATE SET
    chapter_id = EXCLUDED.chapter_id,
    total_games = EXCLUDED.total_games,
    games_completed = EXCLUDED.games_completed,
    game_completion_rate = EXCLUDED.game_completion_rate,
    status = EXCLUDED.status,
    calculated_at = EXCLUDED.calculated_at,
    updated_at = NOW();

  RETURN v_result;
END;
$$;

-- Recalculate topic status for testcbse9
SELECT calculate_topic_status(
  'b6c97a99-dd75-4234-b6a6-0e8de83c885c',
  'af91bf6b-0782-4ee1-a305-29587f9938b1'
);