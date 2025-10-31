-- Add '13th' to student_class enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'student_class'
      AND e.enumlabel = '13th'
  ) THEN
    ALTER TYPE student_class ADD VALUE '13th';
  END IF;
END $$;