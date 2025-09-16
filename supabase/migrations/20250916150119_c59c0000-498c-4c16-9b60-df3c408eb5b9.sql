-- Insert 10 dummy students with profiles and analytics
-- First, let's insert some auth users (simulated with profiles)
INSERT INTO public.profiles (id, email, full_name, avatar_url) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'priya.patel@example.com', 'Priya Patel', 'https://images.unsplash.com/photo-1494790108755-2616b612b190?w=150'),
('550e8400-e29b-41d4-a716-446655440002', 'rahul.sharma@example.com', 'Rahul Sharma', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
('550e8400-e29b-41d4-a716-446655440003', 'anita.gupta@example.com', 'Anita Gupta', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'),
('550e8400-e29b-41d4-a716-446655440004', 'vikram.singh@example.com', 'Vikram Singh', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'),
('550e8400-e29b-41d4-a716-446655440005', 'kavya.reddy@example.com', 'Kavya Reddy', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'),
('550e8400-e29b-41d4-a716-446655440006', 'arjun.kumar@example.com', 'Arjun Kumar', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'),
('550e8400-e29b-41d4-a716-446655440007', 'sneha.joshi@example.com', 'Sneha Joshi', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
('550e8400-e29b-41d4-a716-446655440008', 'rohit.mehta@example.com', 'Rohit Mehta', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150'),
('550e8400-e29b-41d4-a716-446655440009', 'pooja.agarwal@example.com', 'Pooja Agarwal', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'),
('550e8400-e29b-41d4-a716-446655440010', 'karthik.rao@example.com', 'Karthik Rao', 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150');

-- Assign student roles to all of them
INSERT INTO public.user_roles (user_id, role) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'student'),
('550e8400-e29b-41d4-a716-446655440002', 'student'),
('550e8400-e29b-41d4-a716-446655440003', 'student'),
('550e8400-e29b-41d4-a716-446655440004', 'student'),
('550e8400-e29b-41d4-a716-446655440005', 'student'),
('550e8400-e29b-41d4-a716-446655440006', 'student'),
('550e8400-e29b-41d4-a716-446655440007', 'student'),
('550e8400-e29b-41d4-a716-446655440008', 'student'),
('550e8400-e29b-41d4-a716-446655440009', 'student'),
('550e8400-e29b-41d4-a716-446655440010', 'student');

-- Create batches
INSERT INTO public.batches (id, name, level, description, instructor_id, start_date, max_capacity, current_strength) VALUES
('batch-001', 'JEE Advanced 2024', 'advanced', 'Advanced preparation for JEE entrance exam', '550e8400-e29b-41d4-a716-446655440001', '2024-01-15', 50, 6),
('batch-002', 'NEET Foundation', 'intermediate', 'Foundation course for medical entrance', '550e8400-e29b-41d4-a716-446655440002', '2024-02-01', 40, 4);

-- Assign students to batches
UPDATE public.profiles SET batch_id = 'batch-001' WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002', 
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440006'
);

UPDATE public.profiles SET batch_id = 'batch-002' WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440007',
  '550e8400-e29b-41d4-a716-446655440008',
  '550e8400-e29b-41d4-a716-446655440009',
  '550e8400-e29b-41d4-a716-446655440010'
);

-- Insert student analytics data
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
('550e8400-e29b-41d4-a716-446655440010', 6900, 6, 76.8, 9, 4, 52, CURRENT_DATE - 3);

-- Create some courses
INSERT INTO public.courses (id, title, description, subject, level, instructor_id, is_published, total_videos, duration_hours) VALUES
('course-001', 'Advanced Mathematics for JEE', 'Comprehensive math course covering all JEE topics', 'Mathematics', 'advanced', '550e8400-e29b-41d4-a716-446655440001', true, 45, 120),
('course-002', 'Physics Fundamentals', 'Core physics concepts and problem solving', 'Physics', 'intermediate', '550e8400-e29b-41d4-a716-446655440002', true, 38, 95),
('course-003', 'Organic Chemistry Mastery', 'Complete organic chemistry with reactions', 'Chemistry', 'advanced', '550e8400-e29b-41d4-a716-446655440001', true, 52, 140),
('course-004', 'Biology for NEET', 'Comprehensive biology course for medical entrance', 'Biology', 'intermediate', '550e8400-e29b-41d4-a716-446655440002', true, 60, 150);

-- Enroll students in courses
INSERT INTO public.enrollments (student_id, course_id, progress, total_watch_time_minutes) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'course-001', 75, 540),
('550e8400-e29b-41d4-a716-446655440001', 'course-002', 60, 380),
('550e8400-e29b-41d4-a716-446655440002', 'course-001', 85, 680),
('550e8400-e29b-41d4-a716-446655440002', 'course-003', 70, 420),
('550e8400-e29b-41d4-a716-446655440003', 'course-001', 45, 290),
('550e8400-e29b-41d4-a716-446655440003', 'course-002', 55, 340),
('550e8400-e29b-41d4-a716-446655440004', 'course-001', 80, 580),
('550e8400-e29b-41d4-a716-446655440004', 'course-002', 90, 720),
('550e8400-e29b-41d4-a716-446655440005', 'course-002', 35, 210),
('550e8400-e29b-41d4-a716-446655440005', 'course-003', 40, 260),
('550e8400-e29b-41d4-a716-446655440006', 'course-001', 65, 450),
('550e8400-e29b-41d4-a716-446655440007', 'course-004', 95, 850),
('550e8400-e29b-41d4-a716-446655440008', 'course-004', 70, 520),
('550e8400-e29b-41d4-a716-446655440009', 'course-004', 88, 740),
('550e8400-e29b-41d4-a716-446655440010', 'course-004', 60, 420);

-- Create some tests
INSERT INTO public.tests (id, title, description, subject, difficulty, duration_minutes, total_marks, passing_marks, created_by, is_published, course_id) VALUES
('test-001', 'Calculus Advanced Test', 'Test covering advanced calculus concepts', 'Mathematics', 'hard', 180, 100, 60, '550e8400-e29b-41d4-a716-446655440001', true, 'course-001'),
('test-002', 'Physics Mechanics Quiz', 'Quick test on mechanics fundamentals', 'Physics', 'medium', 90, 50, 30, '550e8400-e29b-41d4-a716-446655440002', true, 'course-002'),
('test-003', 'Organic Reactions Test', 'Comprehensive test on organic reactions', 'Chemistry', 'hard', 150, 80, 48, '550e8400-e29b-41d4-a716-446655440001', true, 'course-003'),
('test-004', 'Biology Mock Test', 'Full length biology mock test', 'Biology', 'medium', 180, 120, 72, '550e8400-e29b-41d4-a716-446655440002', true, 'course-004');

-- Create test attempts for students
INSERT INTO public.test_attempts (test_id, student_id, score, total_marks, percentage, started_at, submitted_at, status, time_taken_minutes, attempt_number, rank) VALUES
('test-001', '550e8400-e29b-41d4-a716-446655440001', 85, 100, 85, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '150 minutes', 'submitted', 150, 1, 3),
('test-001', '550e8400-e29b-41d4-a716-446655440002', 92, 100, 92, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '140 minutes', 'submitted', 140, 1, 1),
('test-001', '550e8400-e29b-41d4-a716-446655440003', 76, 100, 76, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '165 minutes', 'submitted', 165, 1, 5),
('test-001', '550e8400-e29b-41d4-a716-446655440004', 88, 100, 88, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '145 minutes', 'submitted', 145, 1, 2),
('test-001', '550e8400-e29b-41d4-a716-446655440006', 82, 100, 82, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '155 minutes', 'submitted', 155, 1, 4),

('test-002', '550e8400-e29b-41d4-a716-446655440001', 42, 50, 84, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '75 minutes', 'submitted', 75, 1, 4),
('test-002', '550e8400-e29b-41d4-a716-446655440002', 47, 50, 94, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '70 minutes', 'submitted', 70, 1, 1),
('test-002', '550e8400-e29b-41d4-a716-446655440003', 38, 50, 76, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '85 minutes', 'submitted', 85, 1, 5),
('test-002', '550e8400-e29b-41d4-a716-446655440004', 45, 50, 90, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '72 minutes', 'submitted', 72, 1, 2),
('test-002', '550e8400-e29b-41d4-a716-446655440005', 35, 50, 70, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '88 minutes', 'submitted', 88, 1, 6),

('test-004', '550e8400-e29b-41d4-a716-446655440007', 110, 120, 92, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '160 minutes', 'submitted', 160, 1, 1),
('test-004', '550e8400-e29b-41d4-a716-446655440008', 95, 120, 79, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '175 minutes', 'submitted', 175, 1, 3),
('test-004', '550e8400-e29b-41d4-a716-446655440009', 105, 120, 88, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '165 minutes', 'submitted', 165, 1, 2),
('test-004', '550e8400-e29b-41d4-a716-446655440010', 88, 120, 73, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '180 minutes', 'submitted', 180, 1, 4);