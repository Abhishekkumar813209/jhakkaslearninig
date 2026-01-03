-- ============================================================================
-- FIX LECTURE QUESTIONS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active lecture questions" ON public.lecture_questions;
DROP POLICY IF EXISTS "Authenticated users can insert lecture questions" ON public.lecture_questions;
DROP POLICY IF EXISTS "Authenticated users can update lecture questions" ON public.lecture_questions;
DROP POLICY IF EXISTS "Authenticated users can delete lecture questions" ON public.lecture_questions;

-- ============================================================================
-- NEW POLICIES
-- ============================================================================

-- 1. Students can only view ACTIVE lecture questions
CREATE POLICY "Students can view active lecture questions"
ON public.lecture_questions
FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. Admins can view ALL lecture questions (active + inactive)
CREATE POLICY "Admins can view all lecture questions"
ON public.lecture_questions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- 3. Only admins can INSERT lecture questions
CREATE POLICY "Admins can insert lecture questions"
ON public.lecture_questions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

-- 4. Only admins can UPDATE lecture questions (with proper WITH CHECK!)
CREATE POLICY "Admins can update lecture questions"
ON public.lecture_questions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

-- 5. Only admins can DELETE lecture questions
CREATE POLICY "Admins can delete lecture questions"
ON public.lecture_questions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));