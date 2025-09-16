-- Remove the database constraint temporarily and allow demo profiles
-- Create table for per-subject scores
CREATE TABLE IF NOT EXISTS public.student_subject_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  subject TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS  
ALTER TABLE public.student_subject_scores ENABLE ROW LEVEL SECURITY;

-- Insert demo profiles manually without auth constraint
DO $$ 
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440001'::uuid,'Priya Patel','priya@example.com'),
    ('550e8400-e29b-41d4-a716-446655440002'::uuid,'Rahul Sharma','rahul@example.com'),
    ('550e8400-e29b-41d4-a716-446655440003'::uuid,'Anita Gupta','anita@example.com'),
    ('550e8400-e29b-41d4-a716-446655440004'::uuid,'Vikram Singh','vikram@example.com'),
    ('550e8400-e29b-41d4-a716-446655440005'::uuid,'Kavya Reddy','kavya@example.com'),
    ('550e8400-e29b-41d4-a716-446655440006'::uuid,'Arjun Kumar','arjun@example.com'),
    ('550e8400-e29b-41d4-a716-446655440007'::uuid,'Sneha Joshi','sneha@example.com'),
    ('550e8400-e29b-41d4-a716-446655440008'::uuid,'Rohit Mehta','rohit@example.com'),
    ('550e8400-e29b-41d4-a716-446655440009'::uuid,'Pooja Agarwal','pooja@example.com'),
    ('550e8400-e29b-41d4-a716-446655440010'::uuid,'Karthik Rao','karthik@example.com')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
  EXCEPTION
    WHEN OTHERS THEN
      -- Profiles may already exist, continue
      NULL;
END $$;

-- Create RLS policy for subject scores
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_subject_scores' AND policyname = 'Students can view their own subject scores'
  ) THEN
    CREATE POLICY "Students can view their own subject scores"
    ON public.student_subject_scores
    FOR SELECT
    USING (student_id = auth.uid());
  END IF;
END $$;

-- Seed student_analytics for the same students
DO $$
BEGIN
  INSERT INTO public.student_analytics (student_id, total_study_time_minutes, average_score, streak_days, batch_rank, overall_rank)
  VALUES 
    ('550e8400-e29b-41d4-a716-446655440001'::uuid, 142*60, 87, 12, 4, 1250),
    ('550e8400-e29b-41d4-a716-446655440002'::uuid, 120*60, 81, 8, 12, 2400),
    ('550e8400-e29b-41d4-a716-446655440003'::uuid, 160*60, 90, 15, 2, 980),
    ('550e8400-e29b-41d4-a716-446655440004'::uuid, 95*60, 72, 5, 35, 5200),
    ('550e8400-e29b-41d4-a716-446655440005'::uuid, 130*60, 85, 10, 9, 1800),
    ('550e8400-e29b-41d4-a716-446655440006'::uuid, 155*60, 88, 14, 3, 1200),
    ('550e8400-e29b-41d4-a716-446655440007'::uuid, 110*60, 79, 6, 20, 3600),
    ('550e8400-e29b-41d4-a716-446655440008'::uuid, 140*60, 86, 11, 6, 1600),
    ('550e8400-e29b-41d4-a716-446655440009'::uuid, 100*60, 75, 7, 28, 4200),
    ('550e8400-e29b-41d4-a716-446655440010'::uuid, 135*60, 83, 9, 11, 2100)
  ON CONFLICT (student_id) DO UPDATE SET 
    total_study_time_minutes = EXCLUDED.total_study_time_minutes,
    average_score = EXCLUDED.average_score,
    streak_days = EXCLUDED.streak_days,
    batch_rank = EXCLUDED.batch_rank,
    overall_rank = EXCLUDED.overall_rank;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Analytics may already exist, continue
      NULL;
END $$;

-- Seed per-subject scores (Math, Physics, Chemistry, Biology, English)
INSERT INTO public.student_subject_scores (student_id, subject, score)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001'::uuid,'Mathematics',85),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid,'Physics',78),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid,'Chemistry',92),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid,'Biology',74),
  ('550e8400-e29b-41d4-a716-446655440001'::uuid,'English',88),

  ('550e8400-e29b-41d4-a716-446655440002'::uuid,'Mathematics',80),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid,'Physics',76),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid,'Chemistry',84),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid,'Biology',70),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid,'English',82),

  ('550e8400-e29b-41d4-a716-446655440003'::uuid,'Mathematics',92),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid,'Physics',88),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid,'Chemistry',94),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid,'Biology',81),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid,'English',90),

  ('550e8400-e29b-41d4-a716-446655440004'::uuid,'Mathematics',68),
  ('550e8400-e29b-41d4-a716-446655440004'::uuid,'Physics',71),
  ('550e8400-e29b-41d4-a716-446655440004'::uuid,'Chemistry',75),
  ('550e8400-e29b-41d4-a716-446655440004'::uuid,'Biology',65),
  ('550e8400-e29b-41d4-a716-446655440004'::uuid,'English',70),

  ('550e8400-e29b-41d4-a716-446655440005'::uuid,'Mathematics',86),
  ('550e8400-e29b-41d4-a716-446655440005'::uuid,'Physics',82),
  ('550e8400-e29b-41d4-a716-446655440005'::uuid,'Chemistry',87),
  ('550e8400-e29b-41d4-a716-446655440005'::uuid,'Biology',78),
  ('550e8400-e29b-41d4-a716-446655440005'::uuid,'English',85),

  ('550e8400-e29b-41d4-a716-446655440006'::uuid,'Mathematics',90),
  ('550e8400-e29b-41d4-a716-446655440006'::uuid,'Physics',86),
  ('550e8400-e29b-41d4-a716-446655440006'::uuid,'Chemistry',91),
  ('550e8400-e29b-41d4-a716-446655440006'::uuid,'Biology',80),
  ('550e8400-e29b-41d4-a716-446655440006'::uuid,'English',88),

  ('550e8400-e29b-41d4-a716-446655440007'::uuid,'Mathematics',78),
  ('550e8400-e29b-41d4-a716-446655440007'::uuid,'Physics',74),
  ('550e8400-e29b-41d4-a716-446655440007'::uuid,'Chemistry',80),
  ('550e8400-e29b-41d4-a716-446655440007'::uuid,'Biology',69),
  ('550e8400-e29b-41d4-a716-446655440007'::uuid,'English',76),

  ('550e8400-e29b-41d4-a716-446655440008'::uuid,'Mathematics',88),
  ('550e8400-e29b-41d4-a716-446655440008'::uuid,'Physics',83),
  ('550e8400-e29b-41d4-a716-446655440008'::uuid,'Chemistry',89),
  ('550e8400-e29b-41d4-a716-446655440008'::uuid,'Biology',77),
  ('550e8400-e29b-41d4-a716-446655440008'::uuid,'English',86),

  ('550e8400-e29b-41d4-a716-446655440009'::uuid,'Mathematics',74),
  ('550e8400-e29b-41d4-a716-446655440009'::uuid,'Physics',70),
  ('550e8400-e29b-41d4-a716-446655440009'::uuid,'Chemistry',76),
  ('550e8400-e29b-41d4-a716-446655440009'::uuid,'Biology',66),
  ('550e8400-e29b-41d4-a716-446655440009'::uuid,'English',72),

  ('550e8400-e29b-41d4-a716-446655440010'::uuid,'Mathematics',84),
  ('550e8400-e29b-41d4-a716-446655440010'::uuid,'Physics',81),
  ('550e8400-e29b-41d4-a716-446655440010'::uuid,'Chemistry',86),
  ('550e8400-e29b-41d4-a716-446655440010'::uuid,'Biology',75),
  ('550e8400-e29b-41d4-a716-446655440010'::uuid,'English',82)
ON CONFLICT (student_id, subject) DO UPDATE SET score = EXCLUDED.score;