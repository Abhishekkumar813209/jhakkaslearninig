-- Remove the foreign key constraint from fee_records.marked_by
-- This will allow marking payments without requiring a profile record for the admin
ALTER TABLE public.fee_records 
DROP CONSTRAINT IF EXISTS fee_records_marked_by_fkey;

-- Make marked_by field nullable and add a comment explaining it stores admin user ID
COMMENT ON COLUMN public.fee_records.marked_by IS 'Admin user ID who marked this payment as paid';