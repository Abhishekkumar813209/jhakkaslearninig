-- Update sync_gamified_exercises_from_content trigger to remove coin_reward references
CREATE OR REPLACE FUNCTION public.sync_gamified_exercises_from_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mapping_id UUID;
  v_game_order INTEGER;
BEGIN
  -- Only process if lesson_type is 'game' and human_reviewed is true
  IF NEW.lesson_type = 'game' AND NEW.human_reviewed = true AND NEW.game_data IS NOT NULL THEN
    -- Get the topic_content_mapping id for this topic
    SELECT id INTO v_mapping_id
    FROM topic_content_mapping
    WHERE topic_id = NEW.topic_id AND content_type = 'theory'
    LIMIT 1;
    
    IF v_mapping_id IS NOT NULL THEN
      -- Calculate next game_order
      SELECT COALESCE(MAX(game_order), 0) + 1 INTO v_game_order
      FROM gamified_exercises
      WHERE topic_content_id = v_mapping_id;
      
      -- Upsert the gamified_exercise (WITHOUT coin_reward)
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
        'mcq'::exercise_type,
        jsonb_build_object(
          'question', NEW.game_data->>'question',
          'options', NEW.game_data->'options',
          'correctAnswerIndex', COALESCE((NEW.game_data->>'correct_answer')::int, 0),
          'marks', COALESCE((NEW.game_data->>'marks')::int, 1),
          'difficulty', COALESCE(NEW.game_data->>'difficulty', 'medium')
        ),
        jsonb_build_object(
          'correctAnswerIndex', COALESCE((NEW.game_data->>'correct_answer')::int, 0)
        ),
        NEW.game_data->>'explanation',
        COALESCE(NEW.game_data->>'difficulty', 'medium'),
        COALESCE(NEW.xp_reward, 10),
        v_game_order
      )
      ON CONFLICT (topic_content_id, game_order) DO UPDATE SET
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