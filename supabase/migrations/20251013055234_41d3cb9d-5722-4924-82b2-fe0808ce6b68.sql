-- Step 1: Clean up duplicate referral codes (keep oldest per user+code)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY referrer_id, referral_code
           ORDER BY created_at ASC
         ) AS rn
  FROM referrals
)
DELETE FROM referrals
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 2: Clean up duplicate codes across different users (keep oldest)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY referral_code
           ORDER BY created_at ASC
         ) AS rn
  FROM referrals
)
DELETE FROM referrals
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 3: Add UNIQUE constraint on referral_code
ALTER TABLE referrals
  ADD CONSTRAINT referrals_referral_code_unique UNIQUE (referral_code);

-- Step 4: Add UNIQUE constraint on referrer_id (one code per user)
ALTER TABLE referrals
  ADD CONSTRAINT referrals_referrer_unique UNIQUE (referrer_id);

-- Step 5: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);