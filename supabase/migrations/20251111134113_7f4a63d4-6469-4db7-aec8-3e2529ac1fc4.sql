-- ============================================================================
-- MIGRATION: Standardize match_pair to SINGULAR form across entire system
-- ============================================================================
-- This migration enforces match_pair (singular) as the canonical form,
-- migrates all existing match_pairs (plural) data, and updates triggers.
-- ============================================================================

-- Step 1: Add singular form to exercise_type enum (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'match_pair' AND enumtypid = 'exercise_type'::regtype) THEN
    ALTER TYPE exercise_type ADD VALUE 'match_pair';
    RAISE NOTICE '✅ Added match_pair to exercise_type enum';
  ELSE
    RAISE NOTICE '✓ match_pair already exists in exercise_type enum';
  END IF;
END $$;

-- Step 2: Migrate all existing plural forms to singular in all tables
-- ============================================================================

-- 2a. Update topic_learning_content.game_type
UPDATE topic_learning_content 
SET game_type = 'match_pair' 
WHERE game_type = 'match_pairs';

-- 2b. Update gamified_exercises.exercise_type
UPDATE gamified_exercises 
SET exercise_type = 'match_pair'::exercise_type 
WHERE exercise_type::text = 'match_pairs';

-- 2c. Update topic_content_mapping.content_type (if any exist)
UPDATE topic_content_mapping 
SET content_type = 'match_pair'::exercise_type 
WHERE content_type::text = 'match_pairs';

-- Log migration results
DO $$
DECLARE
  count_learning_content INTEGER;
  count_gamified INTEGER;
  count_mapping INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_learning_content FROM topic_learning_content WHERE game_type = 'match_pairs';
  SELECT COUNT(*) INTO count_gamified FROM gamified_exercises WHERE exercise_type::text = 'match_pairs';
  SELECT COUNT(*) INTO count_mapping FROM topic_content_mapping WHERE content_type::text = 'match_pairs';
  
  RAISE NOTICE '📊 Migration complete:';
  RAISE NOTICE '   topic_learning_content remaining match_pairs: %', count_learning_content;
  RAISE NOTICE '   gamified_exercises remaining match_pairs: %', count_gamified;
  RAISE NOTICE '   topic_content_mapping remaining match_pairs: %', count_mapping;
END $$;

-- Step 3: Update CHECK constraint on topic_learning_content to enforce singular
-- ============================================================================

-- Drop existing CHECK constraint
ALTER TABLE topic_learning_content DROP CONSTRAINT IF EXISTS valid_game_type_check;
ALTER TABLE topic_learning_content DROP CONSTRAINT IF EXISTS topic_learning_content_game_type_check;

-- Create new CHECK constraint with ONLY singular forms
ALTER TABLE topic_learning_content 
ADD CONSTRAINT valid_game_type_check CHECK (
  game_type IS NULL OR game_type IN (
    'mcq',
    'true_false', 
    'match_column',      -- Singular only
    'match_pair',        -- Singular only (NEW)
    'drag_drop',
    'drag_drop_sort',
    'sequence_order',
    'drag_drop_sequence',
    'word_puzzle',
    'crossword',
    'fill_blanks',
    'fill_blank',
    'typing_race',
    'assertion_reason'
  )
);

-- Step 4: Update sync_gamified_exercises_from_content trigger
-- ============================================================================
-- This ensures future inserts automatically normalize to singular

CREATE OR REPLACE FUNCTION public.sync_gamified_exercises_from_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  mapping_id UUID;
  normalized_type text;
  max_order INT;
BEGIN
  -- Only process if this is a game lesson that's been approved
  IF NEW.lesson_type = 'game' 
     AND NEW.human_reviewed = true 
     AND NEW.game_data IS NOT NULL THEN
    
    -- Normalize game_type to SINGULAR form (CRITICAL FIX)
    normalized_type := CASE 
      WHEN NEW.game_type IN ('match_pairs', 'match_pair') THEN 'match_pair'          -- SINGULAR
      WHEN NEW.game_type IN ('match_columns', 'match_column') THEN 'match_column'    -- SINGULAR
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
    
    -- Insert into gamified_exercises
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
$function$;