-- Add razorpay_order_id column to test_subscriptions table for one-time payments
ALTER TABLE public.test_subscriptions 
ADD COLUMN IF NOT EXISTS razorpay_order_id text;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_test_subscriptions_razorpay_order_id 
ON public.test_subscriptions(razorpay_order_id);

-- Add comment for clarity
COMMENT ON COLUMN public.test_subscriptions.razorpay_order_id 
IS 'Razorpay order ID for one-time payments (alternative to subscription_id)';