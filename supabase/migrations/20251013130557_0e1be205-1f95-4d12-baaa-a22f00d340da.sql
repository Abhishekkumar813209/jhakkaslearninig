-- Add RLS policies for admins to manage withdrawals
CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawal_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update withdrawals"
ON public.withdrawal_history
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));