-- Update existing student analytics with more realistic data for the current user
UPDATE public.student_analytics 
SET 
  total_study_time_minutes = 8520,
  streak_days = 12,
  average_score = 87.5,
  tests_attempted = 15,
  batch_rank = 4,
  overall_rank = 24,
  last_active_date = CURRENT_DATE
WHERE student_id = '4f3ef101-0bcb-4671-9fb0-07a6ec197b18';

-- Create mock data for comparison purposes
INSERT INTO public.student_analytics (student_id, total_study_time_minutes, streak_days, average_score, tests_attempted, batch_rank, overall_rank, last_active_date) VALUES
('550e8400-e29b-41d4-a716-446655440001', 8520, 12, 87.5, 15, 4, 24, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440002', 9240, 18, 92.3, 18, 1, 8, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440003', 7890, 9, 78.9, 12, 6, 45, CURRENT_DATE - 1),
('550e8400-e29b-41d4-a716-446655440004', 8760, 15, 89.1, 16, 2, 15, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440005', 6540, 7, 73.4, 10, 8, 67, CURRENT_DATE - 2),
('550e8400-e29b-41d4-a716-446655440006', 8100, 11, 85.2, 14, 5, 32, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440007', 9600, 21, 94.7, 20, 1, 3, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440008', 7200, 8, 81.3, 11, 3, 38, CURRENT_DATE - 1),
('550e8400-e29b-41d4-a716-446655440009', 8820, 14, 88.6, 17, 2, 18, CURRENT_DATE),
('550e8400-e29b-41d4-a716-446655440010', 6900, 6, 76.8, 9, 4, 52, CURRENT_DATE - 3)
ON CONFLICT (student_id) DO UPDATE SET
  total_study_time_minutes = EXCLUDED.total_study_time_minutes,
  streak_days = EXCLUDED.streak_days,
  average_score = EXCLUDED.average_score,
  tests_attempted = EXCLUDED.tests_attempted,
  batch_rank = EXCLUDED.batch_rank,
  overall_rank = EXCLUDED.overall_rank,
  last_active_date = EXCLUDED.last_active_date;

-- Create some test attempts for mock performance data
INSERT INTO public.test_attempts (id, test_id, student_id, score, total_marks, percentage, started_at, submitted_at, status, time_taken_minutes, attempt_number) VALUES
('attempt-001', 'test-001', '550e8400-e29b-41d4-a716-446655440001', 85, 100, 85, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '150 minutes', 'submitted', 150, 1),
('attempt-002', 'test-001', '550e8400-e29b-41d4-a716-446655440002', 92, 100, 92, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '140 minutes', 'submitted', 140, 1),
('attempt-003', 'test-001', '550e8400-e29b-41d4-a716-446655440003', 76, 100, 76, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '165 minutes', 'submitted', 165, 1),
('attempt-004', 'test-002', '550e8400-e29b-41d4-a716-446655440001', 84, 100, 84, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '75 minutes', 'submitted', 75, 1),
('attempt-005', 'test-002', '550e8400-e29b-41d4-a716-446655440002', 94, 100, 94, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '70 minutes', 'submitted', 70, 1)
ON CONFLICT (id) DO NOTHING;

-- Add mock student names for display (using student_id as reference)
CREATE TABLE IF NOT EXISTS public.mock_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  avatar_url text
);

INSERT INTO public.mock_students (student_id, full_name, email, avatar_url) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Priya Patel', 'priya.patel@example.com', 'https://images.unsplash.com/photo-1494790108755-2616b612b190?w=150'),
('550e8400-e29b-41d4-a716-446655440002', 'Rahul Sharma', 'rahul.sharma@example.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
('550e8400-e29b-41d4-a716-446655440003', 'Anita Gupta', 'anita.gupta@example.com', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'),
('550e8400-e29b-41d4-a716-446655440004', 'Vikram Singh', 'vikram.singh@example.com', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'),
('550e8400-e29b-41d4-a716-446655440005', 'Kavya Reddy', 'kavya.reddy@example.com', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'),
('550e8400-e29b-41d4-a716-446655440006', 'Arjun Kumar', 'arjun.kumar@example.com', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'),
('550e8400-e29b-41d4-a716-446655440007', 'Sneha Joshi', 'sneha.joshi@example.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
('550e8400-e29b-41d4-a716-446655440008', 'Rohit Mehta', 'rohit.mehta@example.com', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150'),
('550e8400-e29b-41d4-a716-446655440009', 'Pooja Agarwal', 'pooja.agarwal@example.com', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'),
('550e8400-e29b-41d4-a716-446655440010', 'Karthik Rao', 'karthik.rao@example.com', 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150'),
('4f3ef101-0bcb-4671-9fb0-07a6ec197b18', 'Current User', 'user@example.com', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150')
ON CONFLICT (student_id) DO NOTHING;