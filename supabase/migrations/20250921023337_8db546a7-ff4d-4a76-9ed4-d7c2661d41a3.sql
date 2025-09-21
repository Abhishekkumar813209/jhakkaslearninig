-- Create fees management tables
CREATE TABLE public.fee_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  batch_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  month integer NOT NULL,
  year integer NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  payment_method text,
  is_paid boolean NOT NULL DEFAULT false,
  battery_level integer NOT NULL DEFAULT 100,
  marked_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, month, year)
);

-- Create parent-student relationships
CREATE TABLE public.parent_student_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  relationship text NOT NULL DEFAULT 'parent',
  is_primary_contact boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Create fee reminders log
CREATE TABLE public.fee_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_record_id uuid NOT NULL,
  parent_id uuid NOT NULL,
  reminder_type text NOT NULL, -- 'first', 'second', 'final'
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  email_status text NOT NULL DEFAULT 'sent' -- 'sent', 'failed', 'pending'
);

-- Enable RLS
ALTER TABLE public.fee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fee_records
CREATE POLICY "Students can view their own fee records" 
ON public.fee_records 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Admins can manage all fee records" 
ON public.fee_records 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for parent_student_links
CREATE POLICY "Parents can view their linked students" 
ON public.parent_student_links 
FOR SELECT 
USING (parent_id = auth.uid());

CREATE POLICY "Students can view their parent links" 
ON public.parent_student_links 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Admins can manage parent-student links" 
ON public.parent_student_links 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for fee_reminders
CREATE POLICY "Admins can view all reminders" 
ON public.fee_reminders 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Indexes for better performance
CREATE INDEX idx_fee_records_student_month ON public.fee_records(student_id, month, year);
CREATE INDEX idx_fee_records_batch ON public.fee_records(batch_id);
CREATE INDEX idx_fee_records_due_date ON public.fee_records(due_date);
CREATE INDEX idx_parent_student_links_student ON public.parent_student_links(student_id);

-- Create function to update battery level based on days passed
CREATE OR REPLACE FUNCTION public.update_battery_level()
RETURNS void
LANGUAGE plpgsql
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

-- Create function to generate monthly fee records
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
      5000, -- Default fee amount, can be customized per batch
      current_month,
      current_year,
      due_date_calc,
      100
    );
  END LOOP;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_fee_records_updated_at
  BEFORE UPDATE ON public.fee_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();