-- Phase 1: Centralized Test Bank + Batch Assignment Schema (Fixed)

-- Enhance tests table to support centralized bank (reuse existing table)
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS is_centralized boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS exam_domain text,
ADD COLUMN IF NOT EXISTS board text,
ADD COLUMN IF NOT EXISTS class text,
ADD COLUMN IF NOT EXISTS chapter_library_id uuid REFERENCES chapter_library(id),
ADD COLUMN IF NOT EXISTS default_xp integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS counts_for_parent_progress boolean DEFAULT true;

-- Create batch_tests mapping table for batch-specific test assignments
CREATE TABLE IF NOT EXISTS batch_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  central_test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  is_free boolean DEFAULT false,
  assigned_at timestamptz DEFAULT now(),
  start_date date,
  end_date date,
  max_attempts integer DEFAULT 1,
  xp_override integer,
  created_by uuid REFERENCES profiles(id),
  UNIQUE(batch_id, central_test_id)
);

-- Create index for efficient batch test lookups
CREATE INDEX IF NOT EXISTS idx_batch_tests_batch_id ON batch_tests(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_tests_central_test_id ON batch_tests(central_test_id);

-- Update test_attempts to link to batch_tests (optional, for tracking)
ALTER TABLE test_attempts
ADD COLUMN IF NOT EXISTS batch_test_id uuid REFERENCES batch_tests(id);

-- RLS Policies for batch_tests
ALTER TABLE batch_tests ENABLE ROW LEVEL SECURITY;

-- Admins can manage all batch test assignments (using has_role function)
CREATE POLICY "Admins can manage batch tests"
ON batch_tests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Students can view tests assigned to their batch
CREATE POLICY "Students can view their batch tests"
ON batch_tests
FOR SELECT
TO authenticated
USING (
  batch_id IN (
    SELECT batch_id FROM profiles WHERE id = auth.uid()
  )
);

-- Update tests table RLS to allow viewing centralized tests
CREATE POLICY "Anyone can view centralized tests"
ON tests
FOR SELECT
TO authenticated
USING (is_centralized = true OR is_published = true);