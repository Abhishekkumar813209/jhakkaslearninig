-- Add match_column to exercise_type enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'exercise_type' 
        AND e.enumlabel = 'match_column'
    ) THEN
        ALTER TYPE exercise_type ADD VALUE 'match_column';
        RAISE NOTICE 'Added match_column to exercise_type enum';
    ELSE
        RAISE NOTICE 'match_column already exists in exercise_type enum';
    END IF;
END $$;