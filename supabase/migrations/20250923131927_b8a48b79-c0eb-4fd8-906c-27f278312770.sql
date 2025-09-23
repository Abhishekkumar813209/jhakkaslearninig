-- Update test_subscriptions table to include roadmap access
ALTER TABLE public.test_subscriptions 
ADD COLUMN includes_roadmap boolean DEFAULT true,
ADD COLUMN subscription_name text DEFAULT 'Test Series + Learning Paths';

-- Update existing subscriptions to include roadmap access
UPDATE public.test_subscriptions 
SET includes_roadmap = true, 
    subscription_name = 'Test Series + Learning Paths'
WHERE subscription_type = 'premium';