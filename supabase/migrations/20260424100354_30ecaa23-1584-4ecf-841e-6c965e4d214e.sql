
-- 1. New intake columns
ALTER TABLE public.brand_intake
  ADD COLUMN IF NOT EXISTS legal_entity     text,
  ADD COLUMN IF NOT EXISTS gstin            text,
  ADD COLUMN IF NOT EXISTS fssai_license    text,
  ADD COLUMN IF NOT EXISTS zepto_url        text,
  ADD COLUMN IF NOT EXISTS blinkit_url      text,
  ADD COLUMN IF NOT EXISTS instamart_url    text,
  ADD COLUMN IF NOT EXISTS amazon_url       text,
  ADD COLUMN IF NOT EXISTS top_skus         text,
  ADD COLUMN IF NOT EXISTS price_range      text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. Trigger: notify admins when a new intake row arrives
CREATE OR REPLACE FUNCTION public.notify_admins_new_brand_intake()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, audience, kind, title, body, link_url, metadata)
  SELECT ur.user_id, 'admin', 'brand_intake_new',
         'New brand application',
         COALESCE(NEW.brand_name,'A brand') || ' applied to advertise.',
         '/admin/brand-intake/' || NEW.id::text,
         jsonb_build_object('intake_id', NEW.id, 'brand_name', NEW.brand_name, 'contact_email', NEW.contact_email)
  FROM public.user_roles ur
  WHERE ur.role IN ('admin'::app_role, 'super_admin'::app_role, 'owner'::app_role);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_brand_intake ON public.brand_intake;
CREATE TRIGGER trg_notify_admins_new_brand_intake
AFTER INSERT ON public.brand_intake
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_brand_intake();

-- 3. Approve intake RPC: atomically creates brand_accounts + audits + marks intake approved
CREATE OR REPLACE FUNCTION public.approve_brand_intake(
  p_intake_id uuid,
  p_initial_balance numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_intake record;
  v_brand_id uuid;
BEGIN
  IF NOT (
    has_role(v_actor, 'admin'::app_role)
    OR has_role(v_actor, 'super_admin'::app_role)
    OR is_owner(v_actor)
  ) THEN
    RAISE EXCEPTION 'Only admins can approve brand applications' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_intake FROM public.brand_intake WHERE id = p_intake_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found' USING ERRCODE = '02000';
  END IF;
  IF v_intake.status NOT IN ('new','in_review') THEN
    RAISE EXCEPTION 'Application is already %', v_intake.status USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.brand_accounts (brand_name, contact_email, balance, gstin, status)
  VALUES (
    v_intake.brand_name,
    v_intake.contact_email,
    COALESCE(p_initial_balance, 0),
    v_intake.gstin,
    'active'
  )
  RETURNING id INTO v_brand_id;

  UPDATE public.brand_intake
     SET status = 'approved',
         reviewed_by = v_actor,
         reviewed_at = now()
   WHERE id = p_intake_id;

  INSERT INTO public.audit_logs (actor_id, action, target_table, metadata)
  VALUES (v_actor, 'brand_intake_approved', 'brand_intake',
          jsonb_build_object('intake_id', p_intake_id, 'brand_id', v_brand_id, 'brand_name', v_intake.brand_name));

  RETURN v_brand_id;
END;
$$;

-- 4. Reject intake RPC
CREATE OR REPLACE FUNCTION public.reject_brand_intake(
  p_intake_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF NOT (
    has_role(v_actor, 'admin'::app_role)
    OR has_role(v_actor, 'super_admin'::app_role)
    OR is_owner(v_actor)
  ) THEN
    RAISE EXCEPTION 'Only admins can reject brand applications' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A rejection reason is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.brand_intake
     SET status = 'rejected',
         rejection_reason = p_reason,
         reviewed_by = v_actor,
         reviewed_at = now()
   WHERE id = p_intake_id
     AND status IN ('new','in_review');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or already decided' USING ERRCODE = '02000';
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, target_table, metadata)
  VALUES (v_actor, 'brand_intake_rejected', 'brand_intake',
          jsonb_build_object('intake_id', p_intake_id, 'reason', p_reason));
END;
$$;

-- 5. Lock pes_score against non-admin writes
CREATE OR REPLACE FUNCTION public.guard_campaign_pes_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean := has_role(auth.uid(),'admin'::app_role)
                       OR has_role(auth.uid(),'super_admin'::app_role)
                       OR is_owner(auth.uid())
                       OR is_marketer(auth.uid());
  v_is_service boolean := current_setting('role', true) = 'service_role';
BEGIN
  IF v_is_service OR v_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.pes_score := 0;
  ELSIF TG_OP = 'UPDATE' AND NEW.pes_score IS DISTINCT FROM OLD.pes_score THEN
    NEW.pes_score := OLD.pes_score;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_campaign_pes_score ON public.ad_campaigns;
CREATE TRIGGER trg_guard_campaign_pes_score
BEFORE INSERT OR UPDATE ON public.ad_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.guard_campaign_pes_score();
