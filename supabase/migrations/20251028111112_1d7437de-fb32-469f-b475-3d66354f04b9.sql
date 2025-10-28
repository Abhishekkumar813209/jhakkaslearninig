-- Remove duplicate games while preserving student progress
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- First, update student progress to point to the first occurrence of duplicates
  WITH duplicates AS (
    SELECT 
      ge.id,
      ge.topic_content_id,
      ge.exercise_data->>'question' as question,
      ge.game_order,
      ge.created_at,
      ROW_NUMBER() OVER (
        PARTITION BY ge.topic_content_id, ge.exercise_data->>'question' 
        ORDER BY ge.game_order, ge.created_at
      ) as rn
    FROM gamified_exercises ge
    WHERE ge.exercise_data->>'question' IS NOT NULL
      AND ge.exercise_data->>'question' != ''
  ),
  to_keep AS (
    SELECT 
      d1.id as duplicate_id,
      d2.id as keep_id
    FROM duplicates d1
    JOIN duplicates d2 ON 
      d1.topic_content_id = d2.topic_content_id 
      AND d1.question = d2.question
      AND d2.rn = 1
    WHERE d1.rn > 1
  )
  UPDATE student_topic_game_progress stgp
  SET completed_game_ids = (
    SELECT array_agg(DISTINCT
      CASE 
        WHEN cg_id = tk.duplicate_id THEN tk.keep_id
        ELSE cg_id
      END
    )
    FROM unnest(stgp.completed_game_ids) cg_id
    LEFT JOIN to_keep tk ON cg_id = tk.duplicate_id
  )
  WHERE EXISTS (
    SELECT 1 FROM to_keep tk
    WHERE tk.duplicate_id = ANY(stgp.completed_game_ids)
  );

  -- Delete duplicates
  WITH duplicates AS (
    SELECT 
      ge.id,
      ge.topic_content_id,
      ge.exercise_data->>'question' as question,
      ROW_NUMBER() OVER (
        PARTITION BY ge.topic_content_id, ge.exercise_data->>'question' 
        ORDER BY ge.game_order, ge.created_at
      ) as rn
    FROM gamified_exercises ge
    WHERE ge.exercise_data->>'question' IS NOT NULL
      AND ge.exercise_data->>'question' != ''
  )
  DELETE FROM gamified_exercises
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate games', deleted_count;

  -- Reorder remaining games sequentially per topic
  WITH reordered AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY topic_content_id ORDER BY game_order, created_at) - 1 as new_order
    FROM gamified_exercises
  )
  UPDATE gamified_exercises ge
  SET game_order = r.new_order
  FROM reordered r
  WHERE ge.id = r.id;
  
  RAISE NOTICE 'Reordered all games';
END $$;

-- Create function to prevent future duplicates
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
$$ LANGUAGE plpgsql;

-- Create trigger to check for duplicates on insert/update
DROP TRIGGER IF EXISTS check_duplicate_games ON gamified_exercises;
CREATE TRIGGER check_duplicate_games
  BEFORE INSERT OR UPDATE ON gamified_exercises
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_games();

-- Remove coin_reward column (coins are not being used)
ALTER TABLE gamified_exercises DROP COLUMN IF EXISTS coin_reward;

-- Add comment to document the deduplication
COMMENT ON TRIGGER check_duplicate_games ON gamified_exercises IS 
  'Prevents insertion of duplicate questions (same question text) within the same topic. Added to prevent AI extraction duplicates.';