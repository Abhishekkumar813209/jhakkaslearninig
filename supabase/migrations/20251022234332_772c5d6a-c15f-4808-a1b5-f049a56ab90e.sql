-- Clean up duplicate topic_content_mapping entries
-- Keep only the oldest entry per (topic_id, question_id) pair

-- Step 1: Identify duplicates and mark which to keep
WITH ranked_mappings AS (
  SELECT 
    id,
    topic_id,
    question_id,
    ROW_NUMBER() OVER (
      PARTITION BY topic_id, question_id 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM topic_content_mapping
  WHERE question_id IS NOT NULL
),
duplicates_to_delete AS (
  SELECT id 
  FROM ranked_mappings 
  WHERE rn > 1
)
-- Step 2: Delete orphan gamified_exercises linked to duplicate mappings
DELETE FROM gamified_exercises
WHERE topic_content_id IN (SELECT id FROM duplicates_to_delete);

-- Step 3: Delete duplicate topic_content_mapping entries
WITH ranked_mappings AS (
  SELECT 
    id,
    topic_id,
    question_id,
    ROW_NUMBER() OVER (
      PARTITION BY topic_id, question_id 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM topic_content_mapping
  WHERE question_id IS NOT NULL
)
DELETE FROM topic_content_mapping
WHERE id IN (
  SELECT id FROM ranked_mappings WHERE rn > 1
);

-- Step 4: Clean up duplicate gamified_exercises (keep one per topic_content_id + exercise_type)
WITH ranked_exercises AS (
  SELECT 
    id,
    topic_content_id,
    exercise_type,
    ROW_NUMBER() OVER (
      PARTITION BY topic_content_id, exercise_type 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM gamified_exercises
)
DELETE FROM gamified_exercises
WHERE id IN (
  SELECT id FROM ranked_exercises WHERE rn > 1
);

-- Step 5: Add index to prevent future duplicates (enforce uniqueness at query level)
CREATE UNIQUE INDEX IF NOT EXISTS idx_topic_content_mapping_unique_question
ON topic_content_mapping (topic_id, question_id)
WHERE question_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gamified_exercises_unique_per_content
ON gamified_exercises (topic_content_id, exercise_type);

COMMENT ON INDEX idx_topic_content_mapping_unique_question IS 
  'Prevents duplicate mappings of the same question to the same topic';

COMMENT ON INDEX idx_gamified_exercises_unique_per_content IS 
  'Prevents duplicate exercises of the same type for a given topic content';