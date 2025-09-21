-- Add YouTube integration fields to videos table (renaming to lectures)
ALTER TABLE videos RENAME TO lectures;

-- Add YouTube-specific fields to lectures table
ALTER TABLE lectures 
ADD COLUMN youtube_video_id TEXT,
ADD COLUMN processing_status TEXT CHECK (processing_status IN ('pending','processing','ready','failed')) DEFAULT 'pending',
ADD COLUMN playlist_id TEXT;

-- Update existing records to have 'ready' status
UPDATE lectures SET processing_status = 'ready' WHERE processing_status IS NULL;

-- Create reorder function for drag-and-drop
CREATE OR REPLACE FUNCTION public.reorder_lectures(
  course_id_param UUID,
  lecture_ids UUID[]
) RETURNS void AS $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..array_length(lecture_ids, 1) LOOP
    UPDATE lectures 
    SET order_num = i 
    WHERE id = lecture_ids[i] AND course_id = course_id_param;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for lectures table
DROP POLICY IF EXISTS "Instructors can manage their course videos" ON lectures;
DROP POLICY IF EXISTS "Students can view videos of enrolled courses" ON lectures;

CREATE POLICY "Instructors can manage their course lectures" ON lectures
FOR ALL USING (
  course_id IN (
    SELECT id FROM courses WHERE instructor_id = auth.uid()
  )
);

CREATE POLICY "Students can view lectures of enrolled courses" ON lectures
FOR SELECT USING (
  is_published = true AND course_id IN (
    SELECT course_id FROM enrollments WHERE student_id = auth.uid()
  )
);

-- Update video_progress table to reference lectures
ALTER TABLE video_progress RENAME COLUMN video_id TO lecture_id;