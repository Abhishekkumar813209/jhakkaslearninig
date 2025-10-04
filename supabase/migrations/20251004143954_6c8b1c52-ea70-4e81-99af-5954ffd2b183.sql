-- Set a fake admin context so auth.uid() is not null in triggers
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000000"}', true);

-- Migrate legacy students to exam_domain = 'school'
UPDATE public.profiles
SET exam_domain = 'school'
WHERE exam_domain IS NULL
  AND (zone_id IS NOT NULL OR school_id IS NOT NULL);

UPDATE public.profiles
SET exam_domain = 'school'
WHERE exam_domain IS NULL
  AND student_class IS NOT NULL;