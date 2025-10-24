-- Function to clean up deleted game IDs from progress tracking
CREATE OR REPLACE FUNCTION cleanup_deleted_game_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove the deleted game ID from all students' completed_game_ids arrays
  UPDATE student_topic_game_progress
  SET 
    completed_game_ids = array_remove(completed_game_ids, OLD.id),
    questions_completed = GREATEST(0, questions_completed - 1),
    updated_at = NOW()
  WHERE OLD.id = ANY(completed_game_ids);
  
  RAISE NOTICE 'Cleaned up game % from % student progress records', 
    OLD.id, 
    (SELECT COUNT(*) FROM student_topic_game_progress WHERE OLD.id = ANY(completed_game_ids));
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger on gamified_exercises deletion
DROP TRIGGER IF EXISTS trigger_cleanup_game_progress ON gamified_exercises;
CREATE TRIGGER trigger_cleanup_game_progress
AFTER DELETE ON gamified_exercises
FOR EACH ROW
EXECUTE FUNCTION cleanup_deleted_game_progress();