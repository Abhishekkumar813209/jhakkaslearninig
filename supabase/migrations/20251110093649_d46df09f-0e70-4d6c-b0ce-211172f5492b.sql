-- Fix trigger: Remove updated_at column reference that doesn't exist in topic_content_mapping
-- This fixes the error: column "updated_at" of relation "topic_content_mapping" does not exist

CREATE OR REPLACE FUNCTION sync_gamified_exercises_from_content()
RETURNS TRIGGER AS $$
DECLARE
  v_mapping_id UUID;
  v_game_order INTEGER;
  v_exercise_type text;
BEGIN
  -- Only process approved game lessons with data
  IF NEW.lesson_type = 'game' 
     AND NEW.human_reviewed = true 
     AND NEW.game_data IS NOT NULL
     AND (OLD.human_reviewed IS NULL OR OLD.human_reviewed = false) THEN
    
    RAISE NOTICE '[trigger] Auto-publishing game lesson % for topic %', NEW.id, NEW.topic_id;
    
    -- Upsert topic_content_mapping - FIXED: removed updated_at
    INSERT INTO topic_content_mapping (topic_id, content_type, order_num)
    VALUES (NEW.topic_id, 'theory', 1)
    ON CONFLICT (topic_id) 
    DO UPDATE SET 
      content_type = EXCLUDED.content_type,
      order_num = EXCLUDED.order_num
    RETURNING id INTO v_mapping_id;
    
    RAISE NOTICE '[trigger] ✅ Mapping ID: % (upserted)', v_mapping_id;
    
    -- Get next game_order
    SELECT COALESCE(MAX(game_order), 0) + 1 INTO v_game_order
    FROM gamified_exercises
    WHERE topic_content_id = v_mapping_id;
    
    -- Cast game_type to exercise_type (with normalization)
    v_exercise_type := CASE NEW.game_type
      WHEN 'fill_blank' THEN 'fill_blanks'
      WHEN 'match_columns' THEN 'match_column'
      WHEN 'drag_drop' THEN 'drag_drop_sequence'
      ELSE NEW.game_type
    END;
    
    -- Insert into gamified_exercises
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
      v_exercise_type::exercise_type,
      NEW.game_data,
      NEW.game_data->'correct_answer',
      NEW.game_data->>'explanation',
      COALESCE(NEW.game_data->>'difficulty', 'medium'),
      COALESCE(NEW.xp_reward, 10),
      v_game_order
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '[trigger] ✅ Auto-published game to gamified_exercises at order %', v_game_order;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;