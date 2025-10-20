-- Add question_analytics column to store per-question performance data
ALTER TABLE test_analytics_snapshots 
ADD COLUMN IF NOT EXISTS question_analytics JSONB DEFAULT '[]'::jsonb;

-- Create GIN index for efficient querying of JSONB data
CREATE INDEX IF NOT EXISTS idx_question_analytics 
ON test_analytics_snapshots USING gin(question_analytics);

-- Add helpful comment
COMMENT ON COLUMN test_analytics_snapshots.question_analytics IS 
'Stores per-question performance statistics including correct/wrong counts, difficulty level, and student answer distribution';