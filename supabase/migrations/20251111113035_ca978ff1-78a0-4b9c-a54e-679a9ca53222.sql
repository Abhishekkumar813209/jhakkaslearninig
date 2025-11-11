-- Step 1: Temporarily disable the constraint
ALTER TABLE topic_learning_content DROP CONSTRAINT IF EXISTS topic_learning_content_game_type_check;

-- Step 2: Update all existing match_columns to match_column  
UPDATE topic_learning_content
SET game_type = 'match_column'
WHERE game_type = 'match_columns';

-- Step 3: Update gamified_exercises if any exist
UPDATE gamified_exercises
SET exercise_type = 'match_column'::exercise_type
WHERE exercise_type = 'match_columns'::exercise_type;

-- Step 4: Add the new constraint with match_column (singular) allowed
ALTER TABLE topic_learning_content ADD CONSTRAINT topic_learning_content_game_type_check 
CHECK (game_type IN (
  'mcq', 
  'true_false', 
  'fill_blanks', 
  'fill_blank',
  'match_pairs', 
  'match_column',
  'drag_drop',
  'drag_drop_sort',
  'sequence_order',
  'drag_drop_sequence',
  'word_puzzle',
  'crossword',
  'typing_race',
  'assertion_reason'
));

-- Step 5: Update the trigger function
CREATE OR REPLACE FUNCTION sync_gamified_exercises_from_content()
RETURNS TRIGGER AS $$
DECLARE
  v_mapping_id UUID;
  v_normalized_type TEXT;
  v_max_order INTEGER := 0;
BEGIN
  IF NEW.lesson_type = 'game' 
     AND NEW.human_reviewed = true 
     AND NEW.game_data IS NOT NULL 
     AND (OLD.human_reviewed IS DISTINCT FROM NEW.human_reviewed 
          OR OLD.game_data IS DISTINCT FROM NEW.game_data) THEN
    
    v_normalized_type := CASE NEW.game_type
      WHEN 'match_pairs' THEN 'match_pairs'
      WHEN 'match_column' THEN 'match_column'
      WHEN 'drag_drop' THEN 'drag_drop_sort'
      WHEN 'drag_drop_sort' THEN 'drag_drop_sort'
      WHEN 'sequence_order' THEN 'drag_drop_sequence'
      WHEN 'drag_drop_sequence' THEN 'drag_drop_sequence'
      WHEN 'word_puzzle' THEN 'crossword'
      WHEN 'crossword' THEN 'crossword'
      WHEN 'fill_blanks' THEN 'fill_blanks'
      WHEN 'fill_blank' THEN 'fill_blanks'
      WHEN 'typing_race' THEN 'typing_race'
      WHEN 'mcq' THEN 'mcq'
      WHEN 'true_false' THEN 'true_false'
      WHEN 'assertion_reason' THEN 'assertion_reason'
      ELSE NULL
    END;
    
    IF v_normalized_type IS NULL THEN
      RAISE WARNING 'Unknown game_type "%" for lesson %', NEW.game_type, NEW.id;
      RETURN NEW;
    END IF;
    
    INSERT INTO topic_content_mapping (topic_id, content_type, order_num)
    VALUES (NEW.topic_id, 'theory', 1)
    ON CONFLICT (topic_id) DO NOTHING
    RETURNING id INTO v_mapping_id;
    
    IF v_mapping_id IS NULL THEN
      SELECT id INTO v_mapping_id FROM topic_content_mapping WHERE topic_id = NEW.topic_id LIMIT 1;
    END IF;
    
    SELECT COALESCE(MAX(game_order), 0) INTO v_max_order FROM gamified_exercises WHERE topic_content_id = v_mapping_id;
    
    INSERT INTO gamified_exercises (
      topic_content_id, exercise_type, exercise_data, question_text, options, correct_answer, explanation, xp_reward, marks, difficulty, game_order
    ) VALUES (
      v_mapping_id, v_normalized_type::exercise_type, NEW.game_data, NEW.game_data->>'question',
      COALESCE(NEW.game_data->'options', '[]'::jsonb), NEW.game_data->'correct_answer', NEW.game_data->>'explanation',
      COALESCE((NEW.game_data->>'xp_reward')::INTEGER, 10), COALESCE((NEW.game_data->>'marks')::INTEGER, 1),
      COALESCE(NEW.game_data->>'difficulty', 'medium'), v_max_order + 1
    ) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Synced game % (type: %) to gamified_exercises', NEW.id, v_normalized_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;