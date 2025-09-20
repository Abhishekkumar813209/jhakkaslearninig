-- Add missing foreign keys to enable PostgREST relationships used by edge functions

-- 1) profiles.batch_id -> batches.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_batch_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_batch_id_fkey
    FOREIGN KEY (batch_id)
    REFERENCES public.batches(id)
    ON DELETE SET NULL;
  END IF;
END$$;

-- Helpful index for joins
CREATE INDEX IF NOT EXISTS idx_profiles_batch_id ON public.profiles(batch_id);

-- 2) student_analytics.student_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_analytics_student_id_fkey'
  ) THEN
    ALTER TABLE public.student_analytics
    ADD CONSTRAINT student_analytics_student_id_fkey
    FOREIGN KEY (student_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END$$;

-- Helpful index for joins
CREATE INDEX IF NOT EXISTS idx_student_analytics_student_id ON public.student_analytics(student_id);
