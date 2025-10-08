-- Phase 1: Make batch_roadmaps.batch_id nullable and update foreign key constraint

-- First, drop the existing foreign key constraint
ALTER TABLE public.batch_roadmaps 
DROP CONSTRAINT IF EXISTS batch_roadmaps_batch_id_fkey;

-- Make batch_id nullable
ALTER TABLE public.batch_roadmaps 
ALTER COLUMN batch_id DROP NOT NULL;

-- Add new foreign key constraint with ON DELETE SET NULL
ALTER TABLE public.batch_roadmaps 
ADD CONSTRAINT batch_roadmaps_batch_id_fkey 
FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE SET NULL;

-- Add 'orphaned' status to roadmap_status enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'orphaned' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'roadmap_status')
  ) THEN
    ALTER TYPE roadmap_status ADD VALUE 'orphaned';
  END IF;
END $$;