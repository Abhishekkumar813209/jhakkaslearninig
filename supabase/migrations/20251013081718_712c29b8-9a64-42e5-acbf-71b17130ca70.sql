-- Create atomic functions for referral credit operations

-- Function 1: Deduct credits from student wallet atomically
CREATE OR REPLACE FUNCTION public.deduct_referral_credits(
  p_student_id UUID,
  p_amount NUMERIC
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE referral_credits
  SET 
    used_credits = used_credits + p_amount,
    updated_at = NOW()
  WHERE student_id = p_student_id;
END;
$$;

-- Function 2: Add referrer bonus atomically with conflict handling
CREATE OR REPLACE FUNCTION public.add_referrer_bonus(
  p_referrer_id UUID,
  p_bonus NUMERIC
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO referral_credits (student_id, total_credits, last_earned_at)
  VALUES (p_referrer_id, p_bonus, NOW())
  ON CONFLICT (student_id) DO UPDATE SET
    total_credits = referral_credits.total_credits + p_bonus,
    last_earned_at = NOW(),
    updated_at = NOW();
END;
$$;