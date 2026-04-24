-- Prevent removal/demotion of the last remaining owner
CREATE OR REPLACE FUNCTION public.protect_last_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_owners INT;
BEGIN
  -- Only enforce when an owner row is being removed or changed away from 'owner'
  IF (TG_OP = 'DELETE' AND OLD.role = 'owner')
     OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role <> 'owner') THEN
    SELECT COUNT(*) INTO remaining_owners
    FROM public.user_roles
    WHERE role = 'owner'
      AND user_id <> OLD.user_id;

    IF remaining_owners = 0 THEN
      RAISE EXCEPTION 'Cannot remove or demote the last owner. Assign another owner first.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_owner_delete ON public.user_roles;
DROP TRIGGER IF EXISTS trg_protect_last_owner_update ON public.user_roles;

CREATE TRIGGER trg_protect_last_owner_delete
BEFORE DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_last_owner();

CREATE TRIGGER trg_protect_last_owner_update
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_last_owner();