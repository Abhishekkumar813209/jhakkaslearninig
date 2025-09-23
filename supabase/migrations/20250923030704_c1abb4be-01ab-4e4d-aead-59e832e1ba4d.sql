-- Add new column to store time in seconds for more accurate tracking
ALTER TABLE public.test_attempts 
ADD COLUMN time_taken_seconds integer DEFAULT 0;

-- Update existing records to convert minutes to seconds (approximate)
UPDATE public.test_attempts 
SET time_taken_seconds = time_taken_minutes * 60 
WHERE time_taken_seconds = 0;