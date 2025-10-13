-- Step 1: Add missing columns to withdrawal_history
ALTER TABLE withdrawal_history 
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Function to lock credits for withdrawal (atomic operation)
CREATE OR REPLACE FUNCTION lock_credits_for_withdrawal(
  p_student_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Step 3: Function to unlock credits (rollback on failure)
CREATE OR REPLACE FUNCTION unlock_credits_for_withdrawal(
  p_student_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE referral_credits
  SET locked_for_withdrawal = GREATEST(0, locked_for_withdrawal - p_amount),
      updated_at = NOW()
  WHERE student_id = p_student_id;
END;
$$;

-- Step 4: Function to complete withdrawal (deduct credits)
CREATE OR REPLACE FUNCTION complete_withdrawal(
  p_student_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE referral_credits
  SET used_credits = used_credits + p_amount,
      locked_for_withdrawal = GREATEST(0, locked_for_withdrawal - p_amount),
      updated_at = NOW()
  WHERE student_id = p_student_id;
END;
$$;