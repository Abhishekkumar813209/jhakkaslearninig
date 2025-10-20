-- Add topic_id column to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES roadmap_topics(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);

-- Update trigger function to handle NULL topic_id gracefully
CREATE OR REPLACE FUNCTION public.update_topic_status_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_topic_id UUID;
BEGIN
  -- Determine topic_id based on trigger source
  IF TG_TABLE_NAME = 'student_topic_game_progress' THEN
    v_topic_id := NEW.topic_id;
  ELSIF TG_TABLE_NAME = 'test_attempts' THEN
    -- Get all topics from the test questions (only non-NULL topic_ids)
    FOR v_topic_id IN 
      SELECT DISTINCT q.topic_id 
      FROM questions q 
      WHERE q.test_id = NEW.test_id 
        AND q.topic_id IS NOT NULL  -- Skip questions without topics
    LOOP
      PERFORM calculate_topic_status(NEW.student_id, v_topic_id);
    END LOOP;
    RETURN NEW;
  END IF;
  
  IF v_topic_id IS NOT NULL THEN
    PERFORM calculate_topic_status(NEW.student_id, v_topic_id);
  END IF;
  
  RETURN NEW;
END;
$function$;