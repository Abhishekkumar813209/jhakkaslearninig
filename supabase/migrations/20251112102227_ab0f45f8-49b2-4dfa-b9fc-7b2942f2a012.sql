-- Enable decimal XP system with 2 decimal places
-- Step 1: Drop the trigger that depends on total_xp
DROP TRIGGER IF EXISTS trigger_notify_xp_change ON student_gamification;

-- Step 2: Change total_xp and related XP columns from INTEGER to NUMERIC(10,2)
ALTER TABLE student_gamification
ALTER COLUMN total_xp TYPE NUMERIC(10,2),
ALTER COLUMN daily_attendance_xp TYPE NUMERIC(10,2),
ALTER COLUMN social_share_xp TYPE NUMERIC(10,2),
ALTER COLUMN referral_xp TYPE NUMERIC(10,2);

-- Update default values to be numeric compatible
ALTER TABLE student_gamification
ALTER COLUMN total_xp SET DEFAULT 0.00,
ALTER COLUMN daily_attendance_xp SET DEFAULT 0.00,
ALTER COLUMN social_share_xp SET DEFAULT 0.00,
ALTER COLUMN referral_xp SET DEFAULT 0.00;

-- Step 3: Recreate the trigger (function already exists)
CREATE TRIGGER trigger_notify_xp_change
  AFTER INSERT OR UPDATE OF total_xp ON student_gamification
  FOR EACH ROW
  EXECUTE FUNCTION notify_xp_change();