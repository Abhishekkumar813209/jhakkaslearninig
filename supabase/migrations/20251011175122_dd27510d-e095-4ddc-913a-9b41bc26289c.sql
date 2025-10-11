-- Fix RLS policies for daily_attendance to allow upsert operations

-- Drop existing admin policy and recreate with WITH CHECK
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.daily_attendance;

CREATE POLICY "Admins can manage all attendance"
ON public.daily_attendance
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Add student UPDATE policy to enable upsert
CREATE POLICY "Students can update their own attendance"
ON public.daily_attendance
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- Add RLS policies for social_shares table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'social_shares') THEN
    
    -- Enable RLS on social_shares if not already enabled
    ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;
    
    -- Students can insert their own shares
    CREATE POLICY "Students can log their shares"
    ON public.social_shares
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);
    
    -- Admins can view all shares
    CREATE POLICY "Admins can view social shares"
    ON public.social_shares
    FOR SELECT
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::user_role));
    
  END IF;
END $$;