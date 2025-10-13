-- Ensure RLS policies for subscription viewing by admins
DO $$ 
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'test_subscriptions' 
    AND policyname = 'Admins can view all subscriptions'
  ) THEN
    CREATE POLICY "Admins can view all subscriptions"
    ON test_subscriptions FOR SELECT
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::user_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payments' 
    AND policyname = 'Admins can view all payment records'
  ) THEN
    CREATE POLICY "Admins can view all payment records"
    ON payments FOR SELECT
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::user_role));
  END IF;
END $$;

-- Create optimized view for subscription management
CREATE OR REPLACE VIEW student_subscription_details AS
SELECT 
  p.id as student_id,
  p.full_name,
  p.email,
  p.phone_number,
  ts.id as subscription_id,
  ts.subscription_type,
  ts.status as subscription_status,
  ts.start_date,
  ts.end_date,
  ts.amount,
  ts.payment_method,
  ts.created_at as subscribed_at,
  ts.free_test_used,
  pay.id as payment_id,
  pay.razorpay_order_id,
  pay.razorpay_payment_id,
  pay.status as payment_status,
  CASE 
    WHEN ts.subscription_type = 'free' THEN 'free'
    WHEN ts.end_date IS NULL THEN 'no_subscription'
    WHEN ts.end_date > NOW() THEN 'active'
    ELSE 'expired'
  END as current_status,
  CASE
    WHEN ts.end_date IS NOT NULL AND ts.end_date > NOW() THEN
      EXTRACT(DAYS FROM (ts.end_date - NOW()))
    ELSE 0
  END as days_remaining
FROM profiles p
LEFT JOIN test_subscriptions ts ON p.id = ts.student_id
LEFT JOIN payments pay ON ts.id = pay.subscription_id
ORDER BY ts.created_at DESC;

-- Grant access to authenticated users (RLS will still apply)
GRANT SELECT ON student_subscription_details TO authenticated;