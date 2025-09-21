-- Add missing RLS policies for parent_student_links (corrected syntax)
CREATE POLICY "Admins can insert parent-student links" 
ON public.parent_student_links 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update parent-student links" 
ON public.parent_student_links 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete parent-student links" 
ON public.parent_student_links 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Add missing RLS policies for fee_reminders (corrected syntax)
CREATE POLICY "Admins can insert reminders" 
ON public.fee_reminders 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update reminders" 
ON public.fee_reminders 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete reminders" 
ON public.fee_reminders 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role));