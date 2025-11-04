-- Add all missing game types to exercise_type enum
ALTER TYPE exercise_type ADD VALUE IF NOT EXISTS 'match_pairs';
ALTER TYPE exercise_type ADD VALUE IF NOT EXISTS 'fill_blanks';
ALTER TYPE exercise_type ADD VALUE IF NOT EXISTS 'drag_drop_sequence';
ALTER TYPE exercise_type ADD VALUE IF NOT EXISTS 'typing_race';
ALTER TYPE exercise_type ADD VALUE IF NOT EXISTS 'memory_card';
ALTER TYPE exercise_type ADD VALUE IF NOT EXISTS 'crossword';
ALTER TYPE exercise_type ADD VALUE IF NOT EXISTS 'physics_simulation';
ALTER TYPE exercise_type ADD VALUE IF NOT EXISTS 'assertion_reason';

-- Replace trigger function to handle ALL game types dynamically
CREATE OR REPLACE FUNCTION public.sync_gamified_exercises_from_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mapping_id UUID;
  v_game_order INTEGER;
  v_exercise_type exercise_type;
BEGIN
  -- Only process approved game lessons with data
  IF NEW.lesson_type = 'game' AND NEW.human_reviewed = true AND NEW.game_data IS NOT NULL THEN
    
    -- Get topic_content_mapping id
    SELECT id INTO v_mapping_id
    FROM topic_content_mapping
    WHERE topic_id = NEW.topic_id AND content_type = 'theory'
    LIMIT 1;
    
    IF v_mapping_id IS NOT NULL THEN
      -- Calculate next game_order
      SELECT COALESCE(MAX(game_order), 0) + 1 INTO v_game_order
      FROM gamified_exercises
      WHERE topic_content_id = v_mapping_id;
      
      -- Cast game_type to exercise_type (works for ALL types now)
      BEGIN
        v_exercise_type := NEW.game_type::exercise_type;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid game_type: %. Must be one of the exercise_type enum values.', NEW.game_type;
      END;
      
      -- Insert with full game_data as-is (NO hardcoding per type!)
      INSERT INTO gamified_exercises (
        topic_content_id,
        exercise_type,
        exercise_data,
        correct_answer,
        explanation,
        difficulty,
        xp_reward,
        game_order
      ) VALUES (
        v_mapping_id,
        v_exercise_type,
        NEW.game_data,
        NEW.game_data->'correct_answer',
        NEW.game_data->>'explanation',
        COALESCE(NEW.game_data->>'difficulty', 'medium'),
        COALESCE(NEW.xp_reward, 10),
        v_game_order
      )
      ON CONFLICT (topic_content_id, game_order) DO UPDATE SET
        exercise_type = EXCLUDED.exercise_type,
        exercise_data = EXCLUDED.exercise_data,
        correct_answer = EXCLUDED.correct_answer,
        explanation = EXCLUDED.explanation,
        difficulty = EXCLUDED.difficulty,
        xp_reward = EXCLUDED.xp_reward;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;