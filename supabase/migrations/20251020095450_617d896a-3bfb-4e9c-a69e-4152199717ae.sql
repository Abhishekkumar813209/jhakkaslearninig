-- Create table to store historical test analytics snapshots
CREATE TABLE IF NOT EXISTS test_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_attempt_id UUID REFERENCES test_attempts(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  analytics_data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(test_attempt_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_student ON test_analytics_snapshots(student_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_attempt ON test_analytics_snapshots(test_attempt_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_generated ON test_analytics_snapshots(generated_at DESC);

-- Enable RLS
ALTER TABLE test_analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Students can view their own analytics snapshots"
ON test_analytics_snapshots FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all analytics snapshots"
ON test_analytics_snapshots FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can insert analytics snapshots"
ON test_analytics_snapshots FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all analytics snapshots"
ON test_analytics_snapshots FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));