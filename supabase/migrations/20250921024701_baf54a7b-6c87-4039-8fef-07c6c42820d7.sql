-- Add proper foreign key constraints
ALTER TABLE public.fee_records 
ADD CONSTRAINT fee_records_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.fee_records 
ADD CONSTRAINT fee_records_batch_id_fkey 
FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE SET NULL;

ALTER TABLE public.fee_records 
ADD CONSTRAINT fee_records_marked_by_fkey 
FOREIGN KEY (marked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update the generate_monthly_fees function to work with existing profiles
CREATE OR REPLACE FUNCTION public.generate_monthly_fees()
RETURNS void
LANGUAGE plpgsql
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

-- Create some sample data for testing (only if no fee records exist)
DO $$
DECLARE
  student_count integer;
  current_month integer := EXTRACT(month FROM CURRENT_DATE);
  current_year integer := EXTRACT(year FROM CURRENT_DATE);
BEGIN
  -- Check if we have any students
  SELECT COUNT(*) INTO student_count 
  FROM public.profiles p
  JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'student'::user_role;
  
  -- If we have students, generate fees
  IF student_count > 0 THEN
    PERFORM public.generate_monthly_fees();
    RAISE NOTICE 'Generated fees for % students', student_count;
  ELSE
    RAISE NOTICE 'No students found to generate fees for';
  END IF;
END;
$$;