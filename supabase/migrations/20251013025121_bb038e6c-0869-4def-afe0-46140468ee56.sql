-- Create pricing_config table
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL DEFAULT 'Monthly Premium',
  base_price NUMERIC NOT NULL DEFAULT 399,
  display_price NUMERIC NOT NULL DEFAULT 299,
  discount_percentage INTEGER GENERATED ALWAYS AS (
    ROUND(((base_price - display_price) / base_price * 100)::numeric, 0)::integer
  ) STORED,
  is_active BOOLEAN DEFAULT false,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_active_pricing ON pricing_config(is_active) WHERE is_active = true;

ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active pricing"
  ON pricing_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage pricing"
  ON pricing_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Insert default pricing
INSERT INTO pricing_config (plan_name, base_price, display_price, is_active)
VALUES ('Monthly Premium', 399, 299, true);

-- Create promo_codes table
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('flat', 'percentage')),
  discount_value NUMERIC NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  min_purchase_amount NUMERIC DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active promo codes"
  ON promo_codes FOR SELECT
  USING (is_active = true AND NOW() BETWEEN valid_from AND COALESCE(valid_until, '2099-12-31'));

CREATE POLICY "Admins can manage promo codes"
  ON promo_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create referral_config table
CREATE TABLE referral_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_discount NUMERIC NOT NULL DEFAULT 20,
  referrer_bonus NUMERIC NOT NULL DEFAULT 25,
  min_purchase_for_bonus NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_active_referral_config ON referral_config(is_active) WHERE is_active = true;

ALTER TABLE referral_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active referral config"
  ON referral_config FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage referral config"
  ON referral_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Insert default referral config
INSERT INTO referral_config (student_discount, referrer_bonus, is_active)
VALUES (20, 25, true);

-- Create discount_usage_log table
CREATE TABLE discount_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES test_subscriptions(id),
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('friend_referral', 'promo_code', 'referral_credit')),
  code_used TEXT,
  discount_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE discount_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own usage"
  ON discount_usage_log FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins can view all usage"
  ON discount_usage_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Add columns to test_subscriptions
ALTER TABLE test_subscriptions
ADD COLUMN IF NOT EXISTS friend_referral_code TEXT,
ADD COLUMN IF NOT EXISTS promo_code_used TEXT,
ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 299,
ADD COLUMN IF NOT EXISTS friend_discount_applied NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS promo_discount_applied NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_discount_applied NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount_paid NUMERIC;

-- Create RPC function for promo code increment
CREATE OR REPLACE FUNCTION increment_promo_usage(code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE promo_codes.code = increment_promo_usage.code;
END;
$$;