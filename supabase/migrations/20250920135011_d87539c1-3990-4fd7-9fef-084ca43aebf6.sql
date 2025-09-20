-- Add foreign key constraint between profiles.batch_id and batches.id
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_batch_id_fkey 
FOREIGN KEY (batch_id) REFERENCES public.batches(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for better performance on batch_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_batch_id ON public.profiles(batch_id);

-- Create index on batches.id for faster joins (if not exists)
CREATE INDEX IF NOT EXISTS idx_batches_id ON public.batches(id);