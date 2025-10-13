-- First, check if lock_credits_for_withdrawal exists and fix it
DROP FUNCTION IF EXISTS lock_credits_for_withdrawal(uuid, numeric);
DROP FUNCTION IF EXISTS unlock_credits_for_withdrawal(uuid, numeric);
DROP FUNCTION IF EXISTS complete_withdrawal(uuid, numeric);

-- Create lock_credits_for_withdrawal function
CREATE OR REPLACE FUNCTION lock_credits_for_withdrawal(p_student_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available NUMERIC;
BEGIN
  -- Get current available credits
  SELECT (total_credits - used_credits - locked_for_withdrawal) INTO v_available
  FROM referral_credits
  WHERE student_id = p_student_id;
  
  -- Check if sufficient credits
  IF v_available IS NULL OR v_available < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Lock credits atomically
  UPDATE referral_credits
  SET locked_for_withdrawal = locked_for_withdrawal + p_amount,
      updated_at = NOW()
  WHERE student_id = p_student_id;
  
  RETURN TRUE;
END;
$$;

-- Create unlock_credits_for_withdrawal function
CREATE OR REPLACE FUNCTION unlock_credits_for_withdrawal(p_student_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE referral_credits
  SET locked_for_withdrawal = GREATEST(0, locked_for_withdrawal - p_amount),
      updated_at = NOW()
  WHERE student_id = p_student_id;
END;
$$;

-- Create complete_withdrawal function
CREATE OR REPLACE FUNCTION complete_withdrawal(p_student_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE referral_credits
  SET used_credits = used_credits + p_amount,
      locked_for_withdrawal = GREATEST(0, locked_for_withdrawal - p_amount),
      updated_at = NOW()
  WHERE student_id = p_student_id;
END;
$$;