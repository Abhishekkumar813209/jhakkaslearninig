-- Step 1: Clean up duplicate topic_content_mapping entries
-- Keep only the mapping with the most games for each topic
WITH duplicate_mappings AS (
  SELECT 
    tcm.topic_id,
    tcm.id as mapping_id,
    COUNT(ge.id) as game_count,
    ROW_NUMBER() OVER (PARTITION BY tcm.topic_id ORDER BY COUNT(ge.id) DESC, tcm.created_at ASC) as rn
  FROM topic_content_mapping tcm
  LEFT JOIN gamified_exercises ge ON ge.topic_content_id = tcm.id
  GROUP BY tcm.topic_id, tcm.id, tcm.created_at
),
mappings_to_delete AS (
  SELECT mapping_id 
  FROM duplicate_mappings 
  WHERE rn > 1
)
DELETE FROM gamified_exercises
WHERE topic_content_id IN (SELECT mapping_id FROM mappings_to_delete);

-- Delete duplicate mappings
WITH duplicate_mappings AS (
  SELECT 
    tcm.topic_id,
    tcm.id as mapping_id,
    COUNT(ge.id) as game_count,
    ROW_NUMBER() OVER (PARTITION BY tcm.topic_id ORDER BY COUNT(ge.id) DESC, tcm.created_at ASC) as rn
  FROM topic_content_mapping tcm
  LEFT JOIN gamified_exercises ge ON ge.topic_content_id = tcm.id
  GROUP BY tcm.topic_id, tcm.id, tcm.created_at
),
mappings_to_delete AS (
  SELECT mapping_id 
  FROM duplicate_mappings 
  WHERE rn > 1
)
DELETE FROM topic_content_mapping
WHERE id IN (SELECT mapping_id FROM mappings_to_delete);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE topic_content_mapping 
ADD CONSTRAINT unique_topic_content_mapping 
UNIQUE (topic_id);