-- Insert sample data for testing dashboard functionality

-- First, let's insert some sample courses (you'll need to replace instructor_id with actual user IDs)
INSERT INTO public.courses (title, description, subject, level, is_published, price, is_paid, duration_hours, total_videos, instructor_id) VALUES 
('Complete Physics for JEE Main & Advanced', 'Comprehensive physics course covering all JEE topics', 'Physics', 'advanced', true, 4999.00, true, 120, 85, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18'),
('Mathematics Foundation for Class 10th', 'Strong foundation in mathematics for 10th grade students', 'Mathematics', 'intermediate', true, 2999.00, true, 80, 60, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18'),
('Organic Chemistry Mastery', 'Master organic chemistry with practical examples', 'Chemistry', 'advanced', true, 3999.00, true, 90, 70, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18'),
('English Literature & Grammar', 'Comprehensive English course for competitive exams', 'English', 'intermediate', true, 1999.00, true, 60, 45, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18'),
('Biology for NEET Preparation', 'Complete biology course for NEET aspirants', 'Biology', 'advanced', true, 3499.00, true, 100, 75, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tests
INSERT INTO public.tests (title, description, subject, difficulty, duration_minutes, total_marks, passing_marks, is_published, created_by) VALUES 
('Physics - Mechanics Test', 'Test your understanding of mechanics concepts', 'Physics', 'medium', 60, 100, 40, true, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18'),
('Mathematics - Algebra Quiz', 'Quick quiz on algebraic expressions', 'Mathematics', 'easy', 30, 50, 25, true, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18'),
('Chemistry - Organic Reactions', 'Test on organic chemistry reaction mechanisms', 'Chemistry', 'hard', 90, 150, 75, true, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18'),
('Biology - Cell Biology', 'Comprehensive test on cell structure and function', 'Biology', 'medium', 45, 75, 35, true, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18'),
('English - Grammar Test', 'Test your grammar and vocabulary skills', 'English', 'easy', 25, 40, 20, true, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18')
ON CONFLICT (id) DO NOTHING;

-- Insert sample batches
INSERT INTO public.batches (name, description, level, start_date, end_date, max_capacity, current_strength, instructor_id) VALUES 
('JEE Main 2025 Batch A', 'Comprehensive JEE Main preparation batch', 'Advanced', '2024-06-01', '2025-05-31', 150, 142, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18'),
('NEET 2025 Batch B', 'Medical entrance preparation batch', 'Advanced', '2024-07-01', '2025-06-30', 100, 89, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18'),
('Class 10 Foundation', 'Strong foundation for class 10 students', 'Intermediate', '2024-04-01', '2025-03-31', 200, 176, '4f3ef101-0bcb-4671-9fb0-07a6ec197b18')
ON CONFLICT (id) DO NOTHING;