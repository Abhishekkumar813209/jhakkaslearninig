-- Manual fix for Radha-Krishna referral testing
-- Find and link Krishna to Radha's referral, award rewards

DO $$
DECLARE
  v_radha_id UUID;
  v_krishna_id UUID;
  v_referral_id UUID;
BEGIN
  -- Find Radha's user ID (referrer with code RADHA2025)
  SELECT r.referrer_id INTO v_radha_id
  FROM referrals r
  WHERE r.referral_code = 'RADHA2025'
  LIMIT 1;

  -- Find Krishna's user ID
  SELECT id INTO v_krishna_id
  FROM profiles
  WHERE full_name ILIKE '%krishna%' 
    OR email ILIKE '%krishna%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_radha_id IS NULL THEN
    RAISE EXCEPTION 'Radha not found with referral code RADHA2025';
  END IF;

  IF v_krishna_id IS NULL THEN
    RAISE EXCEPTION 'Krishna user not found';
  END IF;

  -- Update referral record to link Krishna
  UPDATE referrals
  SET 
    referred_id = v_krishna_id,
    referred_email = (SELECT email FROM profiles WHERE id = v_krishna_id),
    referred_name = (SELECT full_name FROM profiles WHERE id = v_krishna_id),
    status = 'joined',
    joined_at = NOW()
  WHERE referral_code = 'RADHA2025'
  RETURNING id INTO v_referral_id;

  -- Award Radha +10 XP for referral signup
  UPDATE student_gamification
  SET 
    total_xp = total_xp + 10,
    updated_at = NOW()
  WHERE student_id = v_radha_id;

  -- Award Radha ₹25 wallet credit (only total_credits, available_credits is auto-calculated)
  INSERT INTO referral_credits (student_id, total_credits)
  VALUES (v_radha_id, 25)
  ON CONFLICT (student_id) DO UPDATE SET
    total_credits = referral_credits.total_credits + 25,
    updated_at = NOW();

  RAISE NOTICE 'Successfully linked Krishna (%) to Radha (%) referral. Awarded +10 XP and ₹25 credit.', v_krishna_id, v_radha_id;
END $$;