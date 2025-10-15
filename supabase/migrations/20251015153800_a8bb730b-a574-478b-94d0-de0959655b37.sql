-- Part 1: Fix Current Students - Use DELETE + INSERT to avoid unique constraint violations
-- First, delete old mismatched entries
DELETE FROM student_roadmaps sr
WHERE sr.student_id IN (
  SELECT p.id 
  FROM profiles p
  JOIN batches b ON p.batch_id = b.id
  WHERE b.linked_roadmap_id IS NOT NULL
    AND b.auto_assign_roadmap = true
    AND sr.student_id = p.id
    AND sr.batch_roadmap_id != b.linked_roadmap_id
    AND sr.is_active = true
);

-- Then insert/update to correct roadmap
INSERT INTO student_roadmaps (student_id, batch_roadmap_id, status, progress)
SELECT 
  p.id,
  b.linked_roadmap_id,
  'not_started',
  0
FROM profiles p
JOIN batches b ON p.batch_id = b.id
WHERE b.linked_roadmap_id IS NOT NULL
  AND b.auto_assign_roadmap = true
  AND NOT EXISTS (
    SELECT 1 FROM student_roadmaps sr2
    WHERE sr2.student_id = p.id 
    AND sr2.batch_roadmap_id = b.linked_roadmap_id
    AND sr2.is_active = true
  )
ON CONFLICT (student_id, batch_roadmap_id) 
DO UPDATE SET
  status = 'not_started',
  progress = 0,
  is_active = true,
  updated_at = NOW();

-- Part 2: Add Batch Roadmap Change Trigger - Function to sync students when batch roadmap changes
CREATE OR REPLACE FUNCTION sync_students_on_batch_roadmap_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if linked_roadmap_id actually changed and auto_assign is enabled
  IF NEW.linked_roadmap_id IS DISTINCT FROM OLD.linked_roadmap_id 
     AND NEW.auto_assign_roadmap = true 
     AND NEW.linked_roadmap_id IS NOT NULL THEN
    
    -- Deactivate old roadmap entries for this batch's students
    UPDATE student_roadmaps sr
    SET 
      is_active = false,
      updated_at = NOW()
    WHERE sr.student_id IN (
      SELECT id FROM profiles WHERE batch_id = NEW.id
    )
    AND sr.batch_roadmap_id != NEW.linked_roadmap_id
    AND sr.is_active = true;
    
    -- Insert or reactivate correct roadmap entries
    INSERT INTO student_roadmaps (student_id, batch_roadmap_id, status, progress)
    SELECT 
      id,
      NEW.linked_roadmap_id,
      'not_started',
      0
    FROM profiles 
    WHERE batch_id = NEW.id
    ON CONFLICT (student_id, batch_roadmap_id) 
    DO UPDATE SET
      status = 'not_started',
      progress = 0,
      is_active = true,
      updated_at = NOW();
    
    RAISE NOTICE 'Synced % students to new roadmap %', 
      (SELECT COUNT(*) FROM profiles WHERE batch_id = NEW.id),
      NEW.linked_roadmap_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on batches table
DROP TRIGGER IF EXISTS on_batch_roadmap_updated ON batches;
CREATE TRIGGER on_batch_roadmap_updated
  AFTER UPDATE OF linked_roadmap_id ON batches
  FOR EACH ROW
  EXECUTE FUNCTION sync_students_on_batch_roadmap_change();

-- Part 4: Deactivate Orphaned Roadmaps - Cleanup orphaned student_roadmaps
UPDATE student_roadmaps sr
SET 
  is_active = false,
  updated_at = NOW()
WHERE sr.batch_roadmap_id IN (
  SELECT br.id 
  FROM batch_roadmaps br
  WHERE NOT EXISTS (
    SELECT 1 FROM batches b 
    WHERE b.linked_roadmap_id = br.id 
    AND b.is_active = true
    AND b.auto_assign_roadmap = true
  )
)
AND sr.is_active = true;