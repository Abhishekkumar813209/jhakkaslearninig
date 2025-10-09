-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  referred_email TEXT,
  referred_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'joined', 'paid')),
  bonus_paid DECIMAL(10,2) DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_id);

-- Create referral_credits table
CREATE TABLE IF NOT EXISTS public.referral_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_credits DECIMAL(10,2) NOT NULL DEFAULT 0,
  used_credits DECIMAL(10,2) NOT NULL DEFAULT 0,
  locked_for_withdrawal DECIMAL(10,2) NOT NULL DEFAULT 0,
  available_credits DECIMAL(10,2) GENERATED ALWAYS AS (total_credits - used_credits - locked_for_withdrawal) STORED,
  last_earned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_credits_student ON public.referral_credits(student_id);

-- Create withdrawal_history table
CREATE TABLE IF NOT EXISTS public.withdrawal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  withdrawal_method TEXT DEFAULT 'upi',
  upi_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  admin_approved_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  failure_reason TEXT
);

CREATE INDEX idx_withdrawal_student ON public.withdrawal_history(student_id);
CREATE INDEX idx_withdrawal_status ON public.withdrawal_history(status);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert referrals"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update all referrals"
  ON public.referrals FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for referral_credits
CREATE POLICY "Users can view their own credits"
  ON public.referral_credits FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "System can manage credits"
  ON public.referral_credits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all credits"
  ON public.referral_credits FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for withdrawal_history
CREATE POLICY "Users can view their own withdrawals"
  ON public.withdrawal_history FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Users can create withdrawal requests"
  ON public.withdrawal_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can manage all withdrawals"
  ON public.referral_credits FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Function to update referral_credits updated_at
CREATE OR REPLACE FUNCTION update_referral_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_credits_updated_at
  BEFORE UPDATE ON public.referral_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_credits_updated_at();