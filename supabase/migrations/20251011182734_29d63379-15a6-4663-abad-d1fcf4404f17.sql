-- ============================================
-- PHASE 1: FIX DATABASE CONNECTION ISSUES
-- ============================================

-- Step 1.1: Enable Realtime for Racing Tables
ALTER TABLE student_gamification REPLICA IDENTITY FULL;
ALTER TABLE test_attempts REPLICA IDENTITY FULL;
ALTER TABLE student_analytics REPLICA IDENTITY FULL;
ALTER TABLE subject_analytics REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE student_gamification;
ALTER PUBLICATION supabase_realtime ADD TABLE test_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE student_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE subject_analytics;

-- Step 1.2: Fix/Verify Analytics Trigger
DROP TRIGGER IF EXISTS trigger_update_analytics_after_test ON test_attempts;

CREATE TRIGGER trigger_update_analytics_after_test
AFTER INSERT OR UPDATE ON test_attempts
FOR EACH ROW
WHEN (NEW.status IN ('submitted', 'auto_submitted'))
EXECUTE FUNCTION update_student_analytics_after_test();

-- Step 1.3: Add XP Update Trigger for Leaderboard
CREATE OR REPLACE FUNCTION notify_xp_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Just return NEW to trigger realtime notification
  -- Frontend will refresh leaderboard via subscription
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_xp_change ON student_gamification;

CREATE TRIGGER trigger_notify_xp_change
AFTER UPDATE ON student_gamification
FOR EACH ROW
WHEN (OLD.total_xp IS DISTINCT FROM NEW.total_xp)
EXECUTE FUNCTION notify_xp_change();

-- ============================================
-- PHASE 4: PARENT PORTAL - DATABASE SETUP
-- ============================================

-- Step 4.1: Add parent role to user_role enum (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'parent') THEN
    ALTER TYPE user_role ADD VALUE 'parent';
  END IF;
END $$;

-- Step 4.2: RLS policies for parent access to test_attempts
DROP POLICY IF EXISTS "Parents can view linked students test attempts" ON test_attempts;

CREATE POLICY "Parents can view linked students test attempts"
ON test_attempts FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id FROM parent_student_links 
    WHERE parent_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Step 4.3: RLS policies for parent access to student_analytics
DROP POLICY IF EXISTS "Parents can view linked students analytics" ON student_analytics;

CREATE POLICY "Parents can view linked students analytics"
ON student_analytics FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id FROM parent_student_links 
    WHERE parent_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Step 4.4: RLS policies for parent access to subject_analytics
DROP POLICY IF EXISTS "Parents can view linked students subject analytics" ON subject_analytics;

CREATE POLICY "Parents can view linked students subject analytics"
ON subject_analytics FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id FROM parent_student_links 
    WHERE parent_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Step 4.5: RLS policies for parent access to fee_records
DROP POLICY IF EXISTS "Parents can view linked students fee records" ON fee_records;

CREATE POLICY "Parents can view linked students fee records"
ON fee_records FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id FROM parent_student_links 
    WHERE parent_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Step 4.6: RLS policies for parent access to daily_attendance
DROP POLICY IF EXISTS "Parents can view linked students attendance" ON daily_attendance;

CREATE POLICY "Parents can view linked students attendance"
ON daily_attendance FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id FROM parent_student_links 
    WHERE parent_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Step 4.7: RLS policies for parent access to student_gamification
DROP POLICY IF EXISTS "Parents can view linked students gamification" ON student_gamification;

CREATE POLICY "Parents can view linked students gamification"
ON student_gamification FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT student_id FROM parent_student_links 
    WHERE parent_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::user_role)
);