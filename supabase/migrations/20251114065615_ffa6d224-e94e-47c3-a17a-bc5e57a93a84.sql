-- Create auto-recalculation trigger for topic statuses
-- This trigger automatically recalculates topic status when students complete games

CREATE OR REPLACE FUNCTION public.auto_recalculate_topic_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only recalculate if topic_id is not null
  IF NEW.topic_id IS NOT NULL THEN
    -- Call the existing calculate_topic_status function
    PERFORM calculate_topic_status(NEW.student_id, NEW.topic_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on student_topic_game_progress table
-- Fires after INSERT or UPDATE to automatically update topic status
CREATE TRIGGER trigger_auto_recalculate_topic_status
AFTER INSERT OR UPDATE ON public.student_topic_game_progress
FOR EACH ROW
EXECUTE FUNCTION public.auto_recalculate_topic_status();

-- Add comment for documentation
COMMENT ON FUNCTION public.auto_recalculate_topic_status() IS 
'Automatically recalculates topic status when students complete games. 
Uses new thresholds: >70% green, 50-70% grey, <50% red';

COMMENT ON TRIGGER trigger_auto_recalculate_topic_status ON public.student_topic_game_progress IS 
'Auto-recalculates topic status when game progress updates, eliminating need for manual batch recalculation';