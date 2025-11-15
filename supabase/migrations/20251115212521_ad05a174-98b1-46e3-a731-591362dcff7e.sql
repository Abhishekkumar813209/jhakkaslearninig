-- Add chapter_id to tests table for chapter-wise test tracking
ALTER TABLE tests 
ADD COLUMN chapter_id UUID REFERENCES roadmap_chapters(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_tests_chapter_id ON tests(chapter_id);

-- Add comment for documentation
COMMENT ON COLUMN tests.chapter_id IS 'Links test to a specific chapter in roadmap_chapters table';