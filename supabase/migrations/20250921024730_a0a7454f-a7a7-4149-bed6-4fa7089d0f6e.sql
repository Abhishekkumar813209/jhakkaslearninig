-- Add missing RLS policies for parent_student_links
CREATE POLICY "Admins can insert parent-student links" 
ON public.parent_student_links 
FOR INSERT 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update parent-student links" 
ON public.parent_student_links 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete parent-student links" 
ON public.parent_student_links 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Add missing RLS policies for fee_reminders
CREATE POLICY "Admins can insert reminders" 
ON public.fee_reminders 
FOR INSERT 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update reminders" 
ON public.fee_reminders 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete reminders" 
ON public.fee_reminders 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Fix function search paths
CREATE OR REPLACE FUNCTION public.update_battery_level()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month integer := EXTRACT(month FROM CURRENT_DATE);
  current_year integer := EXTRACT(year FROM CURRENT_DATE);
  days_in_month integer := EXTRACT(days FROM DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day');
  current_day integer := EXTRACT(day FROM CURRENT_DATE);
  new_battery_level integer;
BEGIN
  -- Calculate battery level: starts at 100%, decreases daily
  new_battery_level := GREATEST(0, 100 - ((current_day - 1) * 100 / days_in_month));
  
  -- Update all unpaid fee records for current month
  UPDATE public.fee_records 
  SET 
    battery_level = new_battery_level,
    updated_at = now()
  WHERE 
    month = current_month 
    AND year = current_year 
    AND is_paid = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_monthly_fees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_record RECORD;
  current_month integer := EXTRACT(month FROM CURRENT_DATE);
  current_year integer := EXTRACT(year FROM CURRENT_DATE);
  due_date_calc date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day';
BEGIN
  -- Generate fee records for all students who don't have one for current month
  FOR student_record IN 
    SELECT p.id as student_id, p.batch_id
    FROM public.profiles p
    JOIN public.user_roles ur ON p.id = ur.user_id
    WHERE ur.role = 'student'::user_role
    AND NOT EXISTS (
      SELECT 1 FROM public.fee_records fr 
      WHERE fr.student_id = p.id 
      AND fr.month = current_month 
      AND fr.year = current_year
    )
  LOOP
    INSERT INTO public.fee_records (
      student_id, 
      batch_id, 
      amount, 
      month, 
      year, 
      due_date,
      battery_level
    ) VALUES (
      student_record.student_id,
      student_record.batch_id,
      5000, -- Default fee amount
      current_month,
      current_year,
      due_date_calc,
      100
    );
  END LOOP;
  
  -- Log how many records were created
  RAISE NOTICE 'Generated fee records for month % year %', current_month, current_year;
END;
$$;