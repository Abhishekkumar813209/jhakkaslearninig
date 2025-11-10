-- Make duplicate prevention idempotent + drop strict index
-- This eliminates race condition between frontend and database trigger

-- 1) Make prevent_duplicate_games trigger idempotent (RETURN NULL instead of RAISE EXCEPTION)
CREATE OR REPLACE FUNCTION prevent_duplicate_games()
RETURNS TRIGGER AS $$
DECLARE
  v_duplicate_count INTEGER;
  v_question_text TEXT;
BEGIN
  -- Extract question text based on exercise type
  v_question_text := CASE 
    WHEN NEW.exercise_type = 'mcq' THEN NEW.exercise_data->>'question'
    WHEN NEW.exercise_type = 'fill_blanks' THEN NEW.exercise_data->>'question'
    WHEN NEW.exercise_type = 'match_column' THEN NEW.exercise_data->>'question'
    WHEN NEW.exercise_type = 'drag_drop_sequence' THEN NEW.exercise_data->>'question'
    WHEN NEW.exercise_type = 'true_false' THEN NEW.exercise_data->>'question'
    ELSE NULL
  END;
  
  -- Only check if we have a question text
  IF v_question_text IS NOT NULL THEN
    -- Check for exact duplicate question text in same topic
    SELECT COUNT(*) INTO v_duplicate_count
    FROM gamified_exercises
    WHERE topic_content_id = NEW.topic_content_id
      AND exercise_type = NEW.exercise_type
      AND (
        (exercise_type = 'mcq' AND exercise_data->>'question' = v_question_text)
        OR (exercise_type = 'fill_blanks' AND exercise_data->>'question' = v_question_text)
        OR (exercise_type = 'match_column' AND exercise_data->>'question' = v_question_text)
        OR (exercise_type = 'drag_drop_sequence' AND exercise_data->>'question' = v_question_text)
        OR (exercise_type = 'true_false' AND exercise_data->>'question' = v_question_text)
      )
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF v_duplicate_count > 0 THEN
      -- Silently skip duplicate instead of raising error
      RAISE NOTICE '[prevent_duplicate_games] Skipping duplicate: % (topic_content_id: %)', 
        v_question_text, NEW.topic_content_id;
      RETURN NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION prevent_duplicate_games() IS 'Silently prevents duplicate question text within same topic. Returns NULL to skip insert instead of raising error.';

-- 2) Drop strict index that prevents multiple games of same type per topic
DROP INDEX IF EXISTS idx_gamified_exercises_unique_per_content;

COMMENT ON TABLE gamified_exercises IS 'Allows multiple games of same type per topic. Uniqueness enforced by (topic_content_id, game_order) and prevent_duplicate_games() trigger for text-based dedup only.';