-- Create test_subscriptions table for managing student test subscriptions
CREATE TABLE IF NOT EXISTS public.test_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('free', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'INR',
  payment_id TEXT,
  payment_method TEXT,
  free_test_used BOOLEAN DEFAULT false,
  weekly_tests_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for test subscriptions
CREATE POLICY "Students can view their own subscriptions" 
ON public.test_subscriptions 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own subscriptions" 
ON public.test_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own subscriptions" 
ON public.test_subscriptions 
FOR UPDATE 
USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all subscriptions" 
ON public.test_subscriptions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND role = 'admin'
));

-- Create index for performance
CREATE INDEX idx_test_subscriptions_student_id ON public.test_subscriptions(student_id);
CREATE INDEX idx_test_subscriptions_status ON public.test_subscriptions(status);

-- Add updated_at trigger
CREATE TRIGGER update_test_subscriptions_updated_at
  BEFORE UPDATE ON public.test_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if student has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(student_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.test_subscriptions 
    WHERE student_id = student_id_param 
    AND status = 'active'
    AND (end_date IS NULL OR end_date > now())
    AND subscription_type = 'premium'
  );
$$;

-- Function to check if student has used free test
CREATE OR REPLACE FUNCTION public.has_used_free_test(student_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.test_subscriptions 
    WHERE student_id = student_id_param 
    AND subscription_type = 'free'
    AND free_test_used = true
  );
$$;

-- Function to get subscription status
CREATE OR REPLACE FUNCTION public.get_subscription_status(student_id_param UUID)
RETURNS TABLE(
  subscription_type TEXT,
  status TEXT,
  free_test_available BOOLEAN,
  premium_active BOOLEAN
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    COALESCE(ts.subscription_type, 'none') as subscription_type,
    COALESCE(ts.status, 'none') as status,
    NOT COALESCE(ts.free_test_used, false) as free_test_available,
    EXISTS(
      SELECT 1 FROM public.test_subscriptions ts2
      WHERE ts2.student_id = student_id_param 
      AND ts2.status = 'active'
      AND (ts2.end_date IS NULL OR ts2.end_date > now())
      AND ts2.subscription_type = 'premium'
    ) as premium_active
  FROM public.test_subscriptions ts
  WHERE ts.student_id = student_id_param
  ORDER BY ts.created_at DESC
  LIMIT 1;
$$;