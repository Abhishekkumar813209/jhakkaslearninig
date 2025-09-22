-- Add exam_category column to guided_paths table
ALTER TABLE public.guided_paths 
ADD COLUMN IF NOT EXISTS exam_category TEXT;