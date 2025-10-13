-- One-time migration: Convert legacy referral codes (e.g., ARYAN2025, TEST2025) to algorithmic format (FIRSTNAME-XXXXXX)
-- This migration is idempotent and safe - targets only codes matching ^[A-Z]+2025$ pattern

UPDATE referrals r
SET referral_code = CONCAT(
  UPPER(
    REGEXP_REPLACE(
      COALESCE(SPLIT_PART(p.full_name, ' ', 1), 'USER'),
      '[^A-Za-z0-9]', '',
      'g'
    )
  ),
  '-',
  UPPER(SUBSTRING(MD5(r.referrer_id::text), 1, 6))
)
FROM profiles p
WHERE p.id = r.referrer_id
  AND r.referral_code ~ '^[A-Z]+2025$';