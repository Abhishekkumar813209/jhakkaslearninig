-- Create LMS database schema for courses, tests, enrollments, etc.

-- Create enums for better type safety
CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE test_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE question_type AS ENUM ('mcq', 'subjective');
CREATE TYPE test_attempt_status AS ENUM ('in_progress', 'submitted', 'auto_submitted', 'abandoned');

-- Courses table
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    thumbnail TEXT,
    instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    level course_level NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    is_paid BOOLEAN DEFAULT false,
    duration_hours INTEGER DEFAULT 0,
    total_videos INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    is_published BOOLEAN DEFAULT false,
    enrollment_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos table
CREATE TABLE public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    chapter INTEGER NOT NULL,
    order_num INTEGER NOT NULL,
    video_url TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    thumbnail TEXT,
    is_published BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    watch_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tests table
CREATE TABLE public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    difficulty test_difficulty NOT NULL,
    duration_minutes INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    passing_marks INTEGER NOT NULL,
    instructions TEXT,
    allow_retakes BOOLEAN DEFAULT true,
    max_attempts INTEGER DEFAULT 3,
    is_published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    options JSONB, -- For MCQ options
    correct_answer TEXT,
    marks INTEGER NOT NULL,
    explanation TEXT,
    order_num INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments table
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    total_watch_time_minutes INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- Video progress tracking
CREATE TABLE public.video_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE NOT NULL,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    watch_time_seconds INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enrollment_id, video_id)
);

-- Test attempts table
CREATE TABLE public.test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    score INTEGER DEFAULT 0,
    total_marks INTEGER NOT NULL,
    percentage INTEGER DEFAULT 0,
    time_taken_minutes INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    status test_attempt_status DEFAULT 'in_progress',
    is_graded BOOLEAN DEFAULT false,
    graded_by UUID REFERENCES auth.users(id),
    graded_at TIMESTAMP WITH TIME ZONE,
    feedback TEXT,
    rank INTEGER,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test answers table
CREATE TABLE public.test_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    selected_option TEXT,
    text_answer TEXT,
    is_correct BOOLEAN,
    marks_awarded INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0
);

-- Batches table
CREATE TABLE public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    level TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    max_capacity INTEGER NOT NULL,
    current_strength INTEGER DEFAULT 0,
    instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student analytics table
CREATE TABLE public.student_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    total_study_time_minutes INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_active_date DATE DEFAULT CURRENT_DATE,
    average_score DECIMAL(5,2) DEFAULT 0,
    tests_attempted INTEGER DEFAULT 0,
    batch_rank INTEGER,
    overall_rank INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add batch_id to profiles table
ALTER TABLE public.profiles ADD COLUMN batch_id UUID REFERENCES public.batches(id);

-- Create indexes for better performance
CREATE INDEX idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX idx_courses_subject ON public.courses(subject);
CREATE INDEX idx_courses_published ON public.courses(is_published);
CREATE INDEX idx_videos_course ON public.videos(course_id);
CREATE INDEX idx_videos_chapter_order ON public.videos(course_id, chapter, order_num);
CREATE INDEX idx_tests_course ON public.tests(course_id);
CREATE INDEX idx_tests_created_by ON public.tests(created_by);
CREATE INDEX idx_questions_test ON public.questions(test_id);
CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX idx_test_attempts_student ON public.test_attempts(student_id);
CREATE INDEX idx_test_attempts_test ON public.test_attempts(test_id);
CREATE INDEX idx_student_analytics_student ON public.student_analytics(student_id);

-- Enable RLS on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Anyone can view published courses" ON public.courses
    FOR SELECT USING (is_published = true);

CREATE POLICY "Instructors can manage their courses" ON public.courses
    FOR ALL USING (instructor_id = auth.uid());

CREATE POLICY "Admins can manage all courses" ON public.courses
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for videos
CREATE POLICY "Students can view videos of enrolled courses" ON public.videos
    FOR SELECT USING (
        is_published = true AND 
        course_id IN (
            SELECT course_id FROM public.enrollments 
            WHERE student_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can manage their course videos" ON public.videos
    FOR ALL USING (
        course_id IN (
            SELECT id FROM public.courses 
            WHERE instructor_id = auth.uid()
        )
    );

-- RLS Policies for tests
CREATE POLICY "Students can view tests of enrolled courses" ON public.tests
    FOR SELECT USING (
        is_published = true AND 
        (course_id IS NULL OR course_id IN (
            SELECT course_id FROM public.enrollments 
            WHERE student_id = auth.uid()
        ))
    );

CREATE POLICY "Instructors can manage their tests" ON public.tests
    FOR ALL USING (created_by = auth.uid());

-- RLS Policies for enrollments
CREATE POLICY "Students can view their own enrollments" ON public.enrollments
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can enroll in courses" ON public.enrollments
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their enrollment progress" ON public.enrollments
    FOR UPDATE USING (student_id = auth.uid());

-- RLS Policies for test attempts
CREATE POLICY "Students can view their own test attempts" ON public.test_attempts
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create test attempts" ON public.test_attempts
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their test attempts" ON public.test_attempts
    FOR UPDATE USING (student_id = auth.uid());

-- RLS Policies for student analytics
CREATE POLICY "Students can view their own analytics" ON public.student_analytics
    FOR SELECT USING (student_id = auth.uid());

-- Create trigger functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_student_analytics_updated_at BEFORE UPDATE ON public.student_analytics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to automatically create student analytics record
CREATE OR REPLACE FUNCTION create_student_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.student_analytics (student_id)
    VALUES (NEW.id)
    ON CONFLICT (student_id) DO NOTHING;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create analytics when profile is created
CREATE TRIGGER create_student_analytics_on_profile
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE create_student_analytics();