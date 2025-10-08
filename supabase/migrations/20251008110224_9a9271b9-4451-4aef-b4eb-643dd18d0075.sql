-- Add target_board and target_class columns to batch_roadmaps
ALTER TABLE batch_roadmaps 
ADD COLUMN target_board text,
ADD COLUMN target_class text;

-- Create indexes for faster filtering
CREATE INDEX idx_batch_roadmaps_target_board ON batch_roadmaps(target_board);
CREATE INDEX idx_batch_roadmaps_target_class ON batch_roadmaps(target_class);
CREATE INDEX idx_batch_roadmaps_board_class ON batch_roadmaps(target_board, target_class);

-- Update existing roadmaps with batch data
UPDATE batch_roadmaps br
SET 
  target_board = b.target_board::text,
  target_class = b.target_class::text
FROM batches b
WHERE br.batch_id = b.id 
  AND br.target_board IS NULL;