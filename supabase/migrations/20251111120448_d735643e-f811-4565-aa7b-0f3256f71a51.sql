-- Add match_pair to exercise_type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'match_pair' AND enumtypid = 'exercise_type'::regtype) THEN
        ALTER TYPE exercise_type ADD VALUE 'match_pair';
    END IF;
END $$;