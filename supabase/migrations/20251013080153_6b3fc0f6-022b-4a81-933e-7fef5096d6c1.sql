-- Step 1: Bulk generate missing referral codes for all students without one
INSERT INTO referrals (referrer_id, referral_code)
SELECT 
  p.id,
  CONCAT(
    UPPER(REGEXP_REPLACE(COALESCE(SPLIT_PART(p.full_name, ' ', 1), 'USER'), '[^A-Za-z0-9]', '', 'g')),
    '-',
    UPPER(SUBSTRING(MD5(p.id::text), 1, 6))
  )
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'student'
  AND NOT EXISTS (SELECT 1 FROM referrals r WHERE r.referrer_id = p.id)
ON CONFLICT (referrer_id) DO NOTHING;

-- Step 2: Create function to auto-generate referral code
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code TEXT;
  v_first_name TEXT;
BEGIN
  -- Only proceed if role is student and no referral code exists
  IF NEW.role = 'student' AND NOT EXISTS (
    SELECT 1 FROM referrals WHERE referrer_id = NEW.user_id
  ) THEN
    -- Get first name from profiles
    SELECT SPLIT_PART(full_name, ' ', 1) INTO v_first_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Generate referral code using FIRSTNAME-XXXXXX format
    v_referral_code := CONCAT(
      UPPER(REGEXP_REPLACE(COALESCE(v_first_name, 'USER'), '[^A-Za-z0-9]', '', 'g')),
      '-',
      UPPER(SUBSTRING(MD5(NEW.user_id::text), 1, 6))
    );
    
    -- Insert referral code
    INSERT INTO referrals (referrer_id, referral_code)
    VALUES (NEW.user_id, v_referral_code)
    ON CONFLICT (referrer_id) DO NOTHING;
    
    -- Initialize referral_credits for the student
    INSERT INTO referral_credits (student_id)
    VALUES (NEW.user_id)
    ON CONFLICT (student_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger on user_roles table
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON user_roles;
CREATE TRIGGER trigger_auto_generate_referral_code
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- Step 4: Cleanup duplicate user_roles (keep only the first entry per user)
DELETE FROM user_roles
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM user_roles
  ORDER BY user_id, id
);