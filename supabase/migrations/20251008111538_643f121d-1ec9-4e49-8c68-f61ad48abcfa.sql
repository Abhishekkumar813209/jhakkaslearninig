-- Add board column to batch_roadmaps table
ALTER TABLE batch_roadmaps ADD COLUMN IF NOT EXISTS board text;

-- For existing school roadmaps, copy target_board to board (cast enum to text)
UPDATE batch_roadmaps 
SET board = target_board::text
WHERE exam_type = 'school' AND board IS NULL;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_batch_roadmaps_board ON batch_roadmaps(board);
CREATE INDEX IF NOT EXISTS idx_batch_roadmaps_exam_filters ON batch_roadmaps(exam_type, exam_name);

-- Update exam_type and exam_name for existing roadmaps linked to batches
UPDATE batch_roadmaps br
SET 
  exam_type = COALESCE(br.exam_type, b.exam_type),
  exam_name = COALESCE(br.exam_name, 
    CASE 
      WHEN b.exam_type = 'school' THEN b.target_board::text || ' Class ' || b.target_class::text
      ELSE b.exam_name
    END
  ),
  board = COALESCE(br.board,
    CASE 
      WHEN b.exam_type = 'school' THEN b.target_board::text
      ELSE NULL
    END
  )
FROM batches b
WHERE br.batch_id = b.id 
  AND b.exam_type IS NOT NULL;