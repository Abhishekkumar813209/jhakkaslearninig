-- Add is_free column to tests table to allow admins to mark tests as free
ALTER TABLE public.tests
ADD COLUMN is_free BOOLEAN DEFAULT false;

-- Create index for faster queries on free tests
CREATE INDEX idx_tests_is_free ON public.tests(is_free) WHERE is_free = true;

-- Add comment for documentation
COMMENT ON COLUMN public.tests.is_free IS 'Indicates if the test is free for all students regardless of subscription status';