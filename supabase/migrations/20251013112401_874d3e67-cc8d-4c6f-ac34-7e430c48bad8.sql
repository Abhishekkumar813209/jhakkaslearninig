-- Enable real-time for withdrawal_history table
ALTER TABLE withdrawal_history REPLICA IDENTITY FULL;

-- Add table to realtime publication (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'withdrawal_history'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE withdrawal_history;
    END IF;
END $$;

-- Add columns for phone-based withdrawals
ALTER TABLE withdrawal_history 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS account_holder_name TEXT,
ADD COLUMN IF NOT EXISTS withdrawal_method TEXT DEFAULT 'upi' CHECK (withdrawal_method IN ('upi', 'phone'));

-- Update existing records to have withdrawal_method set
UPDATE withdrawal_history 
SET withdrawal_method = 'upi' 
WHERE withdrawal_method IS NULL;