-- Ensure realtime works for withdrawal_history
ALTER TABLE IF EXISTS public.withdrawal_history REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'withdrawal_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_history;
  END IF;
END $$;

-- Guard against auto-completion without admin via trigger
CREATE OR REPLACE FUNCTION public.enforce_withdrawal_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Normalize on INSERT: always pending, not auto-approved
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.auto_approved := false;
    NEW.completed_at := NULL;
    NEW.admin_approved_by := NULL;
    NEW.payment_reference := NULL;
    RETURN NEW;
  END IF;

  -- On UPDATE, enforce rules
  IF TG_OP = 'UPDATE' THEN
    -- Prevent direct auto-completion without admin markers
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
      IF NEW.payment_reference IS NULL OR length(trim(NEW.payment_reference)) = 0 THEN
        RAISE EXCEPTION 'Payment reference is required to complete a withdrawal';
      END IF;
      IF NEW.admin_approved_by IS NULL THEN
        RAISE EXCEPTION 'Admin approval is required to complete a withdrawal';
      END IF;
      NEW.auto_approved := false; -- force explicit admin flow
      IF NEW.completed_at IS NULL THEN
        NEW.completed_at := now();
      END IF;
    END IF;

    -- Pending stays clean
    IF NEW.status = 'pending' THEN
      NEW.completed_at := NULL;
      NEW.admin_approved_by := NULL;
      NEW.payment_reference := NULL;
      NEW.auto_approved := false;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_before_insert ON public.withdrawal_history;
DROP TRIGGER IF EXISTS trg_withdrawal_before_update ON public.withdrawal_history;
CREATE TRIGGER trg_withdrawal_before_insert
BEFORE INSERT ON public.withdrawal_history
FOR EACH ROW EXECUTE FUNCTION public.enforce_withdrawal_integrity();

CREATE TRIGGER trg_withdrawal_before_update
BEFORE UPDATE ON public.withdrawal_history
FOR EACH ROW EXECUTE FUNCTION public.enforce_withdrawal_integrity();