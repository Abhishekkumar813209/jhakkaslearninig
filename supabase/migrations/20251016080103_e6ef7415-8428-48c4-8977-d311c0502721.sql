-- Create missing topic_content_mapping entries for roadmap topics
INSERT INTO topic_content_mapping (topic_id, content_type, order_num)
SELECT 
  rt.id as topic_id,
  'theory' as content_type,
  COALESCE((SELECT MAX(order_num) + 1 FROM topic_content_mapping WHERE topic_id = rt.id), 1) as order_num
FROM roadmap_topics rt
WHERE NOT EXISTS (
  SELECT 1 FROM topic_content_mapping tcm 
  WHERE tcm.topic_id = rt.id
);

-- Update gamified_exercises to link to the correct topic_content_mapping
-- For games that reference topic IDs directly instead of mapping IDs
WITH game_topic_fixes AS (
  SELECT 
    ge.id as game_id,
    tcm.id as correct_mapping_id
  FROM gamified_exercises ge
  JOIN topic_content_mapping tcm ON tcm.topic_id::text = ge.topic_content_id::text
  WHERE NOT EXISTS (
    SELECT 1 FROM topic_content_mapping tcm2 WHERE tcm2.id = ge.topic_content_id
  )
)
UPDATE gamified_exercises ge
SET topic_content_id = gtf.correct_mapping_id
FROM game_topic_fixes gtf
WHERE ge.id = gtf.game_id;

-- Create function to auto-create topic_content_mapping on new roadmap topic
CREATE OR REPLACE FUNCTION create_topic_content_mapping()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create a default content mapping for the new topic
  INSERT INTO topic_content_mapping (topic_id, content_type, order_num)
  VALUES (NEW.id, 'theory', 1);
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create mapping when roadmap topic is created
DROP TRIGGER IF EXISTS create_topic_mapping_on_insert ON roadmap_topics;
CREATE TRIGGER create_topic_mapping_on_insert
  AFTER INSERT ON roadmap_topics
  FOR EACH ROW
  EXECUTE FUNCTION create_topic_content_mapping();