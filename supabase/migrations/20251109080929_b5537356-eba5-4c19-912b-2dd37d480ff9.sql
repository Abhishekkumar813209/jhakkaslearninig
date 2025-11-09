-- Function to get chapter stats with topic and game counts in a single query
CREATE OR REPLACE FUNCTION public.get_chapter_stats(roadmap_uuid UUID, subject_text TEXT)
RETURNS TABLE(
  id UUID,
  chapter_name TEXT,
  topic_count BIGINT,
  game_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    rc.id,
    rc.chapter_name,
    COUNT(DISTINCT rt.id) as topic_count,
    COUNT(DISTINCT ge.id) as game_count
  FROM roadmap_chapters rc
  LEFT JOIN roadmap_topics rt ON rt.chapter_id = rc.id
  LEFT JOIN topic_content_mapping tcm ON tcm.topic_id = rt.id
  LEFT JOIN gamified_exercises ge ON ge.topic_content_id = tcm.id
  WHERE rc.roadmap_id = roadmap_uuid 
    AND rc.subject = subject_text
  GROUP BY rc.id, rc.chapter_name
  ORDER BY rc.chapter_name;
END;
$function$;

-- Function to get topic game stats with all counts in a single query
CREATE OR REPLACE FUNCTION public.get_topic_game_stats(chapter_uuid UUID)
RETURNS TABLE(
  id UUID,
  topic_name TEXT,
  day_number INTEGER,
  live_count BIGINT,
  ready_to_publish_count BIGINT,
  incomplete_count BIGINT,
  sync_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id,
    rt.topic_name,
    rt.day_number,
    COUNT(DISTINCT ge.id) as live_count,
    COUNT(DISTINCT CASE 
      WHEN tlc.human_reviewed = true 
        AND tlc.game_data IS NOT NULL 
      THEN tlc.id 
    END) as ready_to_publish_count,
    COUNT(DISTINCT CASE 
      WHEN tlc.human_reviewed = true 
        AND tlc.game_data IS NULL 
      THEN tlc.id 
    END) as incomplete_count,
    CASE
      WHEN COUNT(DISTINCT ge.id) > 0 THEN 'synced'
      WHEN COUNT(DISTINCT CASE WHEN tlc.human_reviewed = true AND tlc.game_data IS NOT NULL THEN tlc.id END) > 0 THEN 'ready'
      ELSE 'not_synced'
    END as sync_status
  FROM roadmap_topics rt
  LEFT JOIN topic_content_mapping tcm ON tcm.topic_id = rt.id
  LEFT JOIN gamified_exercises ge ON ge.topic_content_id = tcm.id
  LEFT JOIN topic_learning_content tlc ON tlc.topic_id = rt.id AND tlc.lesson_type = 'game'
  WHERE rt.chapter_id = chapter_uuid
  GROUP BY rt.id, rt.topic_name, rt.day_number
  ORDER BY rt.day_number;
END;
$function$;