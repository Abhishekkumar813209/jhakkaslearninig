-- Create trigger function to cascade delete gamified exercises
CREATE OR REPLACE FUNCTION cascade_delete_question_games()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Delete matching gamified_exercises based on topic_id and question_text
  -- Match via topic_content_mapping -> roadmap_topics
  DELETE FROM gamified_exercises ge
  WHERE ge.topic_content_id IN (
    SELECT tcm.id 
    FROM topic_content_mapping tcm
    WHERE tcm.topic_id = OLD.topic_id
  )
  AND ge.exercise_data->>'question' = OLD.question_text;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'Cascade deleted % gamified exercise(s) for question_bank id %', v_deleted_count, OLD.id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger on question_bank
DROP TRIGGER IF EXISTS cascade_delete_games_on_question_delete ON question_bank;

CREATE TRIGGER cascade_delete_games_on_question_delete
AFTER DELETE ON question_bank
FOR EACH ROW
EXECUTE FUNCTION cascade_delete_question_games();