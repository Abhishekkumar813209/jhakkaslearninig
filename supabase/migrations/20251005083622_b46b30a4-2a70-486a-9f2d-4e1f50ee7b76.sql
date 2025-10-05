-- Part A: Fix Tests Table
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS exam_domain TEXT DEFAULT 'school';

ALTER TABLE tests
DROP CONSTRAINT IF EXISTS tests_exam_domain_check;

ALTER TABLE tests
ADD CONSTRAINT tests_exam_domain_check 
CHECK (exam_domain IN ('school', 'ssc', 'upsc', 'gate', 'cat', 'other'));

CREATE INDEX IF NOT EXISTS idx_tests_exam_domain ON tests(exam_domain);

-- Classify existing SSC tests
UPDATE tests 
SET exam_domain = 'ssc' 
WHERE subject IN ('Reasoning', 'General Knowledge', 'English', 'Quantitative Aptitude', 'Mathematics', 'General Awareness')
  AND target_class IS NULL
  AND exam_domain = 'school';

-- Part B: Fix Roadmaps (Data updates)
-- Note: Profile updates will be done via edge function to avoid trigger issues

-- Link SSC CGL Roadmap to SSC Batch
UPDATE batches
SET 
  linked_roadmap_id = '7571b684-78fd-4ba0-9343-0c71bb8fa75e',
  auto_assign_roadmap = true
WHERE id = 'd616c8c9-1908-49b4-8391-2434dccf11a3'
  AND linked_roadmap_id IS NULL;