-- Fix is_topic_fully_completed to use proper join through topic_content_mapping
CREATE OR REPLACE FUNCTION public.is_topic_fully_completed(p_student_id uuid, p_topic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_games INTEGER;
  completed_games INTEGER;
BEGIN
  -- Count total games in topic (via topic_content_mapping)
  SELECT COUNT(DISTINCT ge.id) INTO total_games
  FROM gamified_exercises ge
  JOIN topic_content_mapping tcm ON ge.topic_content_id = tcm.id
  WHERE tcm.topic_id = p_topic_id;
  
  -- Count completed games
  SELECT COALESCE(array_length(completed_game_ids, 1), 0) INTO completed_games
  FROM student_topic_game_progress
  WHERE student_id = p_student_id AND topic_id = p_topic_id;
  
  RETURN (completed_games >= total_games AND total_games > 0);
END;
$function$;