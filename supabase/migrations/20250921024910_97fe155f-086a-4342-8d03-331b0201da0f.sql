-- Create test scenarios with different battery levels and payment status
UPDATE public.fee_records 
SET 
  battery_level = 15,  -- Critical battery
  updated_at = now()
WHERE student_id = (
  SELECT p.id FROM public.profiles p 
  JOIN public.user_roles ur ON p.id = ur.user_id 
  WHERE ur.role = 'student'::user_role 
  LIMIT 1 OFFSET 0
)
AND month = EXTRACT(month FROM CURRENT_DATE) 
AND year = EXTRACT(year FROM CURRENT_DATE);

UPDATE public.fee_records 
SET 
  battery_level = 20,  -- Low battery
  updated_at = now()
WHERE student_id = (
  SELECT p.id FROM public.profiles p 
  JOIN public.user_roles ur ON p.id = ur.user_id 
  WHERE ur.role = 'student'::user_role 
  LIMIT 1 OFFSET 1
)
AND month = EXTRACT(month FROM CURRENT_DATE) 
AND year = EXTRACT(year FROM CURRENT_DATE);

UPDATE public.fee_records 
SET 
  battery_level = 75,  -- Good battery
  updated_at = now()
WHERE student_id = (
  SELECT p.id FROM public.profiles p 
  JOIN public.user_roles ur ON p.id = ur.user_role 
  WHERE ur.role = 'student'::user_role 
  LIMIT 1 OFFSET 2
)
AND month = EXTRACT(month FROM CURRENT_DATE) 
AND year = EXTRACT(year FROM CURRENT_DATE);

-- Mark some students as paid
UPDATE public.fee_records 
SET 
  is_paid = true,
  paid_date = CURRENT_DATE,
  battery_level = 100,
  payment_method = 'upi',
  updated_at = now()
WHERE student_id = (
  SELECT p.id FROM public.profiles p 
  JOIN public.user_roles ur ON p.id = ur.user_id 
  WHERE ur.role = 'student'::user_role 
  LIMIT 1 OFFSET 3
)
AND month = EXTRACT(month FROM CURRENT_DATE) 
AND year = EXTRACT(year FROM CURRENT_DATE);

UPDATE public.fee_records 
SET 
  is_paid = true,
  paid_date = CURRENT_DATE - INTERVAL '5 days',
  battery_level = 100,
  payment_method = 'cash',
  updated_at = now()
WHERE student_id = (
  SELECT p.id FROM public.profiles p 
  JOIN public.user_roles ur ON p.id = ur.user_id 
  WHERE ur.role = 'student'::user_role 
  LIMIT 1 OFFSET 4
)
AND month = EXTRACT(month FROM CURRENT_DATE) 
AND year = EXTRACT(year FROM CURRENT_DATE);