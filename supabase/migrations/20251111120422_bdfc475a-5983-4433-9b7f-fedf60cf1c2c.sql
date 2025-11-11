-- Step 1: Fix the trigger to use correct column names
CREATE OR REPLACE FUNCTION sync_gamified_exercises_from_content()
RETURNS TRIGGER AS $$
DECLARE
  mapping_id UUID;
  normalized_type text;
  max_order INT;
BEGIN
  -- Only process if this is a game lesson that's been approved
  IF NEW.lesson_type = 'game' 
     AND NEW.human_reviewed = true 
     AND NEW.game_data IS NOT NULL THEN
    
    -- Normalize game_type to singular form (keep as text for now)
    normalized_type := CASE 
      WHEN NEW.game_type IN ('match_pairs', 'match_pair') THEN 'match_pairs'
      WHEN NEW.game_type IN ('match_columns', 'match_column') THEN 'match_column'
      WHEN NEW.game_type IN ('drag_drop', 'drag_drop_sort') THEN 'drag_drop_sort'
      WHEN NEW.game_type IN ('sequence_order', 'drag_drop_sequence') THEN 'drag_drop_sequence'
      WHEN NEW.game_type IN ('word_puzzle', 'crossword') THEN 'crossword'
      WHEN NEW.game_type IN ('fill_blank', 'fill_blanks') THEN 'fill_blanks'
      ELSE NEW.game_type
    END;
    
    -- Get or create topic_content_mapping
    SELECT id INTO mapping_id
    FROM topic_content_mapping
    WHERE topic_id = NEW.topic_id
    LIMIT 1;
    
    IF mapping_id IS NULL THEN
      INSERT INTO topic_content_mapping (topic_id, content_type, created_at)
      VALUES (NEW.topic_id, 'theory', now())
      ON CONFLICT (topic_id) DO UPDATE SET created_at = now()
      RETURNING id INTO mapping_id;
    END IF;
    
    -- Get max game_order for this topic_content_id
    SELECT COALESCE(MAX(game_order), -1) INTO max_order
    FROM gamified_exercises
    WHERE topic_content_id = mapping_id;
    
    -- Insert into gamified_exercises (using only columns that exist)
    INSERT INTO gamified_exercises (
      topic_content_id,
      exercise_type,
      exercise_data,
      game_order,
      xp_reward,
      difficulty
    )
    VALUES (
      mapping_id,
      normalized_type::exercise_type,
      NEW.game_data,
      max_order + 1,
      COALESCE(NEW.xp_reward, 10),
      COALESCE((NEW.game_data->>'difficulty')::text, 'medium')
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;