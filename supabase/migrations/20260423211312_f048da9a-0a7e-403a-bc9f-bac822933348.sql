DROP POLICY IF EXISTS "Super admins read audit logs" ON public.audit_logs;

CREATE POLICY "Admins read audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_owner(auth.uid())
);