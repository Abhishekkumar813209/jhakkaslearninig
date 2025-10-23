-- Drop the incorrect unique constraint that prevents multiple MCQs per topic
DROP INDEX IF EXISTS idx_gamified_exercises_unique_per_content;

-- Ensure the correct constraint exists (allows multiple MCQs with different game_order)
-- This constraint already exists: UNIQUE (topic_content_id, game_order)

-- The trigger function is already correct - it calculates next game_order
-- and uses ON CONFLICT (topic_content_id, game_order)
-- No changes needed to sync_gamified_exercises_from_content() function