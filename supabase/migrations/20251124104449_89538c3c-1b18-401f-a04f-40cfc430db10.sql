-- Phase 1: Add XP management columns to batch_question_assignments
ALTER TABLE batch_question_assignments 
  ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard'));

COMMENT ON COLUMN batch_question_assignments.xp_reward IS 
  'Custom XP reward for this question assignment. NULL means use difficulty-based default.';

COMMENT ON COLUMN batch_question_assignments.difficulty IS 
  'Difficulty level for XP fallback calculation. Defaults to medium if not set.';

-- Phase 2: Create RPC function for batch assignment stats
CREATE OR REPLACE FUNCTION get_batch_assignment_stats(chapter_uuid UUID)
RETURNS TABLE(
  id UUID,
  topic_name TEXT,
  day_number INTEGER,
  assigned_count BIGINT,
  total_xp INTEGER,
  avg_xp NUMERIC,
  legacy_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id,
    rt.topic_name,
    rt.day_number,
    COUNT(DISTINCT bqa.id) as assigned_count,
    SUM(COALESCE(bqa.xp_reward, 
      CASE COALESCE(bqa.difficulty, qb.difficulty, 'medium')
        WHEN 'hard' THEN 50
        WHEN 'medium' THEN 40
        ELSE 30
      END
    ))::INTEGER as total_xp,
    AVG(COALESCE(bqa.xp_reward, 
      CASE COALESCE(bqa.difficulty, qb.difficulty, 'medium')
        WHEN 'hard' THEN 50
        WHEN 'medium' THEN 40
        ELSE 30
      END
    ))::NUMERIC as avg_xp,
    COUNT(DISTINCT ge.id) as legacy_count
  FROM roadmap_topics rt
  LEFT JOIN batch_question_assignments bqa ON bqa.roadmap_topic_id = rt.id
  LEFT JOIN question_bank qb ON qb.id = bqa.question_id
  LEFT JOIN topic_content_mapping tcm ON tcm.topic_id = rt.id
  LEFT JOIN gamified_exercises ge ON ge.topic_content_id = tcm.id
  WHERE rt.chapter_id = chapter_uuid
  GROUP BY rt.id, rt.topic_name, rt.day_number
  ORDER BY rt.day_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;