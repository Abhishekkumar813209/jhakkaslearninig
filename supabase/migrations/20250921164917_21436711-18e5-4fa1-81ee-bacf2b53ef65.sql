-- Fix RLS policies for video_progress table
CREATE POLICY "Students can view their own video progress" 
ON public.video_progress FOR SELECT 
USING (
  enrollment_id IN (
    SELECT id FROM public.enrollments WHERE student_id = auth.uid()
  ) OR
  (student_id IS NOT NULL AND student_id = auth.uid())
);

CREATE POLICY "Students can create their own video progress" 
ON public.video_progress FOR INSERT 
WITH CHECK (
  enrollment_id IN (
    SELECT id FROM public.enrollments WHERE student_id = auth.uid()
  ) OR
  (student_id IS NOT NULL AND student_id = auth.uid())
);

CREATE POLICY "Students can update their own video progress" 
ON public.video_progress FOR UPDATE 
USING (
  enrollment_id IN (
    SELECT id FROM public.enrollments WHERE student_id = auth.uid()
  ) OR
  (student_id IS NOT NULL AND student_id = auth.uid())
);

-- Fix RLS policies for lectures table to handle both course-based and playlist-based lectures
DROP POLICY IF EXISTS "Students can view lectures in their playlists" ON public.lectures;
DROP POLICY IF EXISTS "Instructors can manage their course lectures" ON public.lectures;

CREATE POLICY "Students can view lectures" 
ON public.lectures FOR SELECT 
USING (
  -- Course-based lectures (existing functionality)
  (course_id IS NOT NULL AND course_id IN (
    SELECT enrollments.course_id
    FROM enrollments
    WHERE enrollments.student_id = auth.uid()
  )) OR
  -- Playlist-based lectures (new functionality)
  (playlist_id IS NOT NULL AND playlist_id IN (
    SELECT p.id FROM public.playlists p
    JOIN public.learning_paths lp ON p.learning_path_id = lp.id
    WHERE lp.student_id = auth.uid()
  )) OR
  -- Published lectures without course requirement
  (is_published = true AND course_id IS NULL)
);

CREATE POLICY "Instructors can manage their course lectures" 
ON public.lectures FOR ALL 
USING (
  course_id IS NOT NULL AND course_id IN ( 
    SELECT courses.id
    FROM courses
    WHERE courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Students can manage playlist lectures" 
ON public.lectures FOR ALL 
USING (
  playlist_id IS NOT NULL AND playlist_id IN (
    SELECT p.id FROM public.playlists p
    JOIN public.learning_paths lp ON p.learning_path_id = lp.id
    WHERE lp.student_id = auth.uid()
  )
);

-- Fix function search paths for security
ALTER FUNCTION public.has_role(uuid, user_role) SET search_path = public;
ALTER FUNCTION public.get_user_role(uuid) SET search_path = public;
ALTER FUNCTION public.has_completed_test(uuid) SET search_path = public;