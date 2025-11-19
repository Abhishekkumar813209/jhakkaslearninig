-- Add entry_source column to chapter_library table
ALTER TABLE chapter_library 
ADD COLUMN IF NOT EXISTS entry_source TEXT DEFAULT 'ai' 
CHECK (entry_source IN ('ai', 'manual'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chapter_library_entry_source 
ON chapter_library(entry_source);

-- Add comment for documentation
COMMENT ON COLUMN chapter_library.entry_source IS 'Source of chapter entry: ai (AI generated) or manual (manually added by admin)';