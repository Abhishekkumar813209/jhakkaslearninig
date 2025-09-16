-- Add missing RLS policies for tables that don't have any

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

CREATE POLICY "Admins can manage all videos" ON public.videos
    FOR ALL USING (has_role(auth.uid(), 'admin'));

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

CREATE POLICY "Admins can manage all tests" ON public.tests
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for questions  
CREATE POLICY "Students can view questions of accessible tests" ON public.questions
    FOR SELECT USING (
        test_id IN (
            SELECT id FROM public.tests 
            WHERE is_published = true AND 
            (course_id IS NULL OR course_id IN (
                SELECT course_id FROM public.enrollments 
                WHERE student_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Test creators can manage their questions" ON public.questions
    FOR ALL USING (
        test_id IN (
            SELECT id FROM public.tests 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all questions" ON public.questions
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for batches
CREATE POLICY "Students can view their batch" ON public.batches
    FOR SELECT USING (
        id IN (
            SELECT batch_id FROM public.profiles 
            WHERE id = auth.uid()
        ) OR is_active = true
    );

CREATE POLICY "Instructors can manage their batches" ON public.batches
    FOR ALL USING (instructor_id = auth.uid());

CREATE POLICY "Admins can manage all batches" ON public.batches
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Update existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, check_role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = has_role.user_id 
    AND role = check_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_roles 
  WHERE user_roles.user_id = get_user_role.user_id 
  LIMIT 1;
$function$;