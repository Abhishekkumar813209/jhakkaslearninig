-- Create zones table for managing student zones
CREATE TABLE public.zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE, -- A, B, C, D, E
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for zones
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- Create policies for zones
CREATE POLICY "Admins can manage all zones" 
ON public.zones 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view active zones" 
ON public.zones 
FOR SELECT 
USING (is_active = true);

-- Create schools table for school-level rankings
CREATE TABLE public.schools (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL,
  zone_id uuid NOT NULL,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Create policies for schools
CREATE POLICY "Admins can manage all schools" 
ON public.schools 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Students can view active schools" 
ON public.schools 
FOR SELECT 
USING (is_active = true);

-- Insert default zones
INSERT INTO public.zones (name, code, description) VALUES 
('Zone A', 'A', 'Default zone for all students'),
('Zone B', 'B', 'Zone B for students'),
('Zone C', 'C', 'Zone C for students'),
('Zone D', 'D', 'Zone D for students'),
('Zone E', 'E', 'Zone E for students');

-- Insert default school for Zone A
INSERT INTO public.schools (name, code, zone_id) 
SELECT 'Default School', 'SCH001', id FROM public.zones WHERE code = 'A';

-- Add zone and school columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN zone_id uuid,
ADD COLUMN school_id uuid;

-- Set all existing students to Zone A by default
UPDATE public.profiles 
SET zone_id = (SELECT id FROM public.zones WHERE code = 'A' LIMIT 1),
    school_id = (SELECT id FROM public.schools WHERE code = 'SCH001' LIMIT 1)
WHERE zone_id IS NULL;

-- Add new ranking columns to student_analytics (only the ones that don't exist)
ALTER TABLE public.student_analytics 
ADD COLUMN zone_rank integer,
ADD COLUMN school_rank integer,
ADD COLUMN zone_percentile numeric(5,2),
ADD COLUMN school_percentile numeric(5,2),
ADD COLUMN overall_percentile numeric(5,2);

-- Create function to calculate zone-based rankings
CREATE OR REPLACE FUNCTION public.calculate_zone_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Calculate zone rankings
  WITH zone_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (PARTITION BY p.zone_id ORDER BY sa.average_score DESC, sa.tests_attempted DESC) as zone_rank,
      COUNT(*) OVER (PARTITION BY p.zone_id) as zone_total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.zone_id IS NOT NULL
  )
  UPDATE public.student_analytics sa
  SET 
    zone_rank = zr.zone_rank,
    zone_percentile = ROUND(((zr.zone_total_students - zr.zone_rank + 1) * 100.0 / zr.zone_total_students), 2)
  FROM zone_rankings zr
  WHERE sa.student_id = zr.student_id;

  -- Calculate school rankings
  WITH school_rankings AS (
    SELECT 
      sa.student_id,
      ROW_NUMBER() OVER (PARTITION BY p.school_id ORDER BY sa.average_score DESC, sa.tests_attempted DESC) as school_rank,
      COUNT(*) OVER (PARTITION BY p.school_id) as school_total_students
    FROM public.student_analytics sa
    JOIN public.profiles p ON sa.student_id = p.id
    WHERE p.school_id IS NOT NULL
  )
  UPDATE public.student_analytics sa
  SET 
    school_rank = sr.school_rank,
    school_percentile = ROUND(((sr.school_total_students - sr.school_rank + 1) * 100.0 / sr.school_total_students), 2)
  FROM school_rankings sr
  WHERE sa.student_id = sr.student_id;

  -- Calculate overall rankings across all zones (update existing overall_rank)
  WITH overall_rankings AS (
    SELECT 
      student_id,
      ROW_NUMBER() OVER (ORDER BY average_score DESC, tests_attempted DESC) as overall_rank,
      COUNT(*) OVER () as total_students
    FROM public.student_analytics
  )
  UPDATE public.student_analytics sa
  SET 
    overall_rank = ov.overall_rank,
    overall_percentile = ROUND(((ov.total_students - ov.overall_rank + 1) * 100.0 / ov.total_students), 2)
  FROM overall_rankings ov
  WHERE sa.student_id = ov.student_id;
END;
$$;

-- Add updated_at trigger for zones and schools
CREATE TRIGGER update_zones_updated_at
    BEFORE UPDATE ON public.zones
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints for profiles
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_zone FOREIGN KEY (zone_id) REFERENCES public.zones(id),
ADD CONSTRAINT fk_profiles_school FOREIGN KEY (school_id) REFERENCES public.schools(id);

-- Add foreign key constraint for schools
ALTER TABLE public.schools 
ADD CONSTRAINT fk_schools_zone FOREIGN KEY (zone_id) REFERENCES public.zones(id);

-- Calculate initial rankings for existing data
SELECT public.calculate_zone_rankings();