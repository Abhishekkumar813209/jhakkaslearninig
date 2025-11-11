-- Standardize match_pairs to match_pair (SING ULAR) - Allow both in DB, normalize in trigger

-- Step 1: Drop existing CHECK constraint
ALTER TABLE topic_learning_content 
DROP CONSTRAINT IF EXISTS topic_learning_content_game_type_check;

-- Step 2: Re-add CHECK constraint allowing BOTH forms (for backward compatibility)
ALTER TABLE topic_learning_content 
ADD CONSTRAINT topic_learning_content_game_type_check 
CHECK (game_type IN (
  'mcq', 
  'true_false', 
  'match_column',
  'match_pair',
  'match_pairs',
  'drag_drop', 
  'sequence_order', 
  'word_puzzle', 
  'fill_blanks', 
  'typing_race', 
  'assertion_reason'
));

-- Step 3: Update database trigger to normalize BOTH forms to singular
CREATE OR REPLACE FUNCTION sync_gamified_exercises_from_content()
RETURNS TRIGGER AS $$
DECLARE
  mapping_id uuid;
  normalized_type text;
  max_order int;
BEGIN
  IF NEW.lesson_type = 'game' 
     AND NEW.human_reviewed = true 
     AND NEW.game_data IS NOT NULL 
     AND NEW.game_type IS NOT NULL THEN
    
    -- Normalize game_type to match gamified_exercises.exercise_type enum
    normalized_type := CASE NEW.game_type
      WHEN 'match_columns' THEN 'match_column'
      WHEN 'match_column' THEN 'match_column'
      WHEN 'match_pairs' THEN 'match_pairs'
      WHEN 'match_pair' THEN 'match_pairs'
      WHEN 'drag_drop' THEN 'drag_drop_sort'
      WHEN 'drag_drop_sort' THEN 'drag_drop_sort'
      WHEN 'sequence_order' THEN 'drag_drop_sequence'
      WHEN 'drag_drop_sequence' THEN 'drag_drop_sequence'
      WHEN 'word_puzzle' THEN 'crossword'
      WHEN 'crossword' THEN 'crossword'
      WHEN 'fill_blanks' THEN 'fill_blanks'
      WHEN 'fill_blank' THEN 'fill_blanks'
      ELSE NEW.game_type
    END;

    -- Get or create topic_content_mapping
    SELECT id INTO mapping_id
    FROM topic_content_mapping
    WHERE topic_id = NEW.topic_id;

    IF mapping_id IS NULL THEN
      INSERT INTO topic_content_mapping (topic_id, content_type)
      VALUES (NEW.topic_id, 'theory')
      ON CONFLICT (topic_id) DO UPDATE SET content_type = 'theory'
      RETURNING id INTO mapping_id;
    END IF;

    -- Get max game_order for this topic
    SELECT COALESCE(MAX(game_order), 0) INTO max_order
    FROM gamified_exercises
    WHERE topic_content_id = mapping_id;

    -- Insert into gamified_exercises
    INSERT INTO gamified_exercises (
      topic_content_id,
      exercise_type,
      exercise_data,
      game_order,
      xp_reward,
      estimated_time_minutes,
      difficulty_level
    )
    VALUES (
      mapping_id,
      normalized_type,
      NEW.game_data,
      max_order + 1,
      COALESCE(NEW.xp_reward, 10),
      COALESCE(NEW.estimated_time_minutes, 5),
      COALESCE((NEW.game_data->>'difficulty')::text, 'medium')
    )
    ON CONFLICT DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;