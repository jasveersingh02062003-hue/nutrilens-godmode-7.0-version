-- Blocker #4: user_roles privilege escalation lockdown

-- 1. Drop the dangerous admin-write policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;

-- 2. Re-add admin SELECT-only policy (no write power)
CREATE POLICY "Admins read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ("Owners manage roles" and "Users can read own roles" already exist and are kept)

-- 3. Audit trigger function — logs every role change
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (actor_id, action, target_user_id, target_table, metadata)
    VALUES (
      auth.uid(),
      'role_granted',
      NEW.user_id,
      'user_roles',
      jsonb_build_object('role', NEW.role, 'role_id', NEW.id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (actor_id, action, target_user_id, target_table, metadata)
    VALUES (
      auth.uid(),
      'role_changed',
      NEW.user_id,
      'user_roles',
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role, 'role_id', NEW.id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (actor_id, action, target_user_id, target_table, metadata)
    VALUES (
      auth.uid(),
      'role_revoked',
      OLD.user_id,
      'user_roles',
      jsonb_build_object('role', OLD.role, 'role_id', OLD.id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS trg_audit_user_role_changes ON public.user_roles;
CREATE TRIGGER trg_audit_user_role_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_user_role_changes();

-- 5. Allow audit trigger to insert with NULL actor_id (system actions)
DROP POLICY IF EXISTS "Authenticated insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = actor_id OR actor_id IS NULL);