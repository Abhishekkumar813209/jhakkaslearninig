-- Add lecture-level notes URL to chapter_lectures
ALTER TABLE chapter_lectures ADD COLUMN IF NOT EXISTS lecture_notes_url TEXT;
ALTER TABLE chapter_lectures ADD COLUMN IF NOT EXISTS lecture_notes_title TEXT;

-- Add chapter-level notes URL to chapter_library
ALTER TABLE chapter_library ADD COLUMN IF NOT EXISTS chapter_notes_url TEXT;
ALTER TABLE chapter_library ADD COLUMN IF NOT EXISTS chapter_notes_title TEXT;
ALTER TABLE chapter_library ADD COLUMN IF NOT EXISTS chapter_notes_updated_at TIMESTAMPTZ;