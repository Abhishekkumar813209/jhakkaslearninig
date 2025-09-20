-- Enable RLS on batches table
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage all batches
CREATE POLICY "Admins can manage all batches" 
ON public.batches 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow instructors to manage their own batches
CREATE POLICY "Instructors can manage their batches" 
ON public.batches 
FOR ALL 
USING (instructor_id = auth.uid());

-- Allow users to view batches (for batch selection/enrollment)
CREATE POLICY "Users can view active batches" 
ON public.batches 
FOR SELECT 
USING (is_active = true);