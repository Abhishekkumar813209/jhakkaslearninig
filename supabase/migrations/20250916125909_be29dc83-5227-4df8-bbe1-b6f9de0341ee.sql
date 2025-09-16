-- Create LMS database schema (avoiding duplicate types)

-- Check if enums exist, create only if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_level') THEN
        CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_difficulty') THEN
        CREATE TYPE test_difficulty AS ENUM ('easy', 'medium', 'hard');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
        CREATE TYPE question_type AS ENUM ('mcq', 'subjective');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_attempt_status') THEN
        CREATE TYPE test_attempt_status AS ENUM ('in_progress', 'submitted', 'auto_submitted', 'abandoned');
    END IF;
END $$;

-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
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
CREATE TABLE IF NOT EXISTS public.videos (
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
CREATE TABLE IF NOT EXISTS public.tests (
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
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    options JSONB,
    correct_answer TEXT,
    marks INTEGER NOT NULL,
    explanation TEXT,
    order_num INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
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

-- Test attempts table
CREATE TABLE IF NOT EXISTS public.test_attempts (
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

-- Student analytics table
CREATE TABLE IF NOT EXISTS public.student_analytics (
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

-- Batches table  
CREATE TABLE IF NOT EXISTS public.batches (
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

-- Add batch_id to profiles table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='batch_id') THEN
        ALTER TABLE public.profiles ADD COLUMN batch_id UUID REFERENCES public.batches(id);
    END IF;
END $$;

-- Enable RLS on all new tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Anyone can view published courses" ON public.courses
    FOR SELECT USING (is_published = true);

CREATE POLICY "Instructors can manage their courses" ON public.courses
    FOR ALL USING (instructor_id = auth.uid());

CREATE POLICY "Admins can manage all courses" ON public.courses
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for enrollments
CREATE POLICY "Students can view their own enrollments" ON public.enrollments
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can enroll in courses" ON public.enrollments
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- RLS Policies for test attempts
CREATE POLICY "Students can view their own test attempts" ON public.test_attempts
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create test attempts" ON public.test_attempts
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- RLS Policies for student analytics
CREATE POLICY "Students can view their own analytics" ON public.student_analytics
    FOR SELECT USING (student_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON public.courses(subject);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published);
CREATE INDEX IF NOT EXISTS idx_videos_course ON public.videos(course_id);
CREATE INDEX IF NOT EXISTS idx_tests_course ON public.tests(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student ON public.test_attempts(student_id);