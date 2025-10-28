-- Fix security warning: Add search_path to prevent_duplicate_games function
CREATE OR REPLACE FUNCTION prevent_duplicate_games()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for duplicate questions in the same topic
  IF NEW.exercise_data->>'question' IS NOT NULL AND NEW.exercise_data->>'question' != '' THEN
    IF EXISTS (
      SELECT 1 FROM gamified_exercises
      WHERE topic_content_id = NEW.topic_content_id
        AND exercise_data->>'question' = NEW.exercise_data->>'question'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Duplicate question detected in this topic: %', 
        LEFT(NEW.exercise_data->>'question', 100);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;