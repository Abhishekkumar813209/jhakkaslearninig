-- Ensure RLS policies allow admin inserts with WITH CHECK for topic_content_mapping and gamified_exercises

-- 1) Enable RLS (safe if already enabled)
ALTER TABLE public.topic_content_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamified_exercises ENABLE ROW LEVEL SECURITY;

-- 2) Drop existing overly-restrictive admin policies if present to avoid duplicates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'topic_content_mapping' 
      AND policyname = 'Admins can manage all content mappings'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can manage all content mappings" ON public.topic_content_mapping';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'gamified_exercises' 
      AND policyname = 'Admins can manage all exercises'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can manage all exercises" ON public.gamified_exercises';
  END IF;
END $$;

-- 3) Create admin manage policies with USING and WITH CHECK
CREATE POLICY "Admins can manage all content mappings"
ON public.topic_content_mapping
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all exercises"
ON public.gamified_exercises
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Optional read access for students (non-insert) to view exercises/mappings if needed by client
-- Keep strict by default; adjust later if required by UI
