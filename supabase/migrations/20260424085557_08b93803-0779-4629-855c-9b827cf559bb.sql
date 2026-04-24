
-- ============================================================
-- P0 FIXES: Approval flow, notifications, RLS hardening, wallet, brand roles
-- ============================================================

-- ==== 1. NOTIFICATIONS TABLE ====
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  audience text NOT NULL DEFAULT 'user', -- 'user' | 'admin' | 'brand'
  brand_id uuid,
  kind text NOT NULL,                     -- 'campaign_submitted','campaign_approved','campaign_rejected','low_balance', etc.
  title text NOT NULL,
  body text,
  link_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_audience ON public.notifications(audience, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (audience = 'admin' AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR is_owner(auth.uid())
    ))
    OR (audience = 'brand' AND brand_id IS NOT NULL AND is_brand_member(brand_id))
  );

CREATE POLICY "Users mark own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (audience = 'admin' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR is_owner(auth.uid())))
    OR (audience = 'brand' AND brand_id IS NOT NULL AND is_brand_member(brand_id))
  )
  WITH CHECK (true);

-- Service role / triggers do all inserts; no user-facing INSERT policy needed.

-- ==== 2. CAMPAIGN APPROVAL: lock status transitions ====
-- Brands can only set status to 'draft' or 'pending_review'.
-- Only admins can move to 'active' or 'rejected'.
CREATE OR REPLACE FUNCTION public.enforce_campaign_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean := has_role(auth.uid(), 'admin'::app_role)
                       OR has_role(auth.uid(), 'super_admin'::app_role)
                       OR is_owner(auth.uid());
  v_is_service boolean := current_setting('role', true) = 'service_role';
BEGIN
  -- service role and admins can set any status
  IF v_is_service OR v_is_admin THEN
    RETURN NEW;
  END IF;

  -- For brand members: only allow draft / pending_review
  IF NEW.status NOT IN ('draft', 'pending_review', 'paused') THEN
    RAISE EXCEPTION 'Brands cannot set campaign status to %. Submit for review instead.', NEW.status
      USING ERRCODE = '42501';
  END IF;

  -- Cannot move from rejected/active back to active without admin
  IF TG_OP = 'UPDATE' AND OLD.status IN ('active','rejected') AND NEW.status = 'active' THEN
    RAISE EXCEPTION 'Only admins can re-activate campaigns' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaign_status_guard ON public.ad_campaigns;
CREATE TRIGGER trg_campaign_status_guard
  BEFORE INSERT OR UPDATE OF status ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_status_transition();

-- ==== 3. NOTIFICATION TRIGGERS for campaign lifecycle ====
CREATE OR REPLACE FUNCTION public.notify_campaign_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_brand_name text;
  v_member record;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT brand_name INTO v_brand_name FROM public.brand_accounts WHERE id = NEW.brand_id;

  -- Brand → admin: pending_review
  IF NEW.status = 'pending_review' THEN
    INSERT INTO public.notifications (user_id, audience, brand_id, kind, title, body, link_url, metadata)
    SELECT ur.user_id, 'admin', NEW.brand_id, 'campaign_submitted',
           'New campaign awaiting review',
           COALESCE(v_brand_name,'A brand') || ' submitted "' || NEW.campaign_name || '"',
           '/admin/ads/' || NEW.id::text,
           jsonb_build_object('campaign_id', NEW.id, 'brand_id', NEW.brand_id)
    FROM public.user_roles ur
    WHERE ur.role IN ('admin'::app_role, 'super_admin'::app_role, 'owner'::app_role);
  END IF;

  -- Admin → brand: approved / rejected
  IF NEW.status IN ('active','rejected') AND
     (TG_OP = 'INSERT' OR OLD.status = 'pending_review') THEN
    FOR v_member IN
      SELECT user_id FROM public.brand_members WHERE brand_id = NEW.brand_id
    LOOP
      INSERT INTO public.notifications (user_id, audience, brand_id, kind, title, body, link_url, metadata)
      VALUES (
        v_member.user_id, 'brand', NEW.brand_id,
        CASE WHEN NEW.status = 'active' THEN 'campaign_approved' ELSE 'campaign_rejected' END,
        CASE WHEN NEW.status = 'active' THEN 'Campaign approved' ELSE 'Campaign rejected' END,
        '"' || NEW.campaign_name || '" was ' ||
          CASE WHEN NEW.status = 'active' THEN 'approved and is now live.' ELSE 'rejected. Edit and resubmit.' END,
        '/brand/campaigns',
        jsonb_build_object('campaign_id', NEW.id, 'status', NEW.status)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaign_notify ON public.ad_campaigns;
CREATE TRIGGER trg_campaign_notify
  AFTER INSERT OR UPDATE OF status ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.notify_campaign_status_change();

-- ==== 4. submit_campaign_for_review RPC ====
CREATE OR REPLACE FUNCTION public.submit_campaign_for_review(p_campaign_id uuid)
RETURNS TABLE(id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_brand_id uuid;
  v_balance numeric;
  v_budget numeric;
BEGIN
  SELECT c.brand_id, c.budget_total INTO v_brand_id, v_budget
  FROM public.ad_campaigns c WHERE c.id = p_campaign_id;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found' USING ERRCODE = '02000';
  END IF;

  IF NOT (is_brand_member(v_brand_id)
          OR has_role(auth.uid(),'admin'::app_role)
          OR has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT balance INTO v_balance FROM public.brand_accounts WHERE id = v_brand_id;
  IF COALESCE(v_balance,0) < COALESCE(v_budget,0) THEN
    RAISE EXCEPTION 'Insufficient wallet balance for budget. Top up first.' USING ERRCODE = '23514';
  END IF;

  UPDATE public.ad_campaigns
     SET status = 'pending_review', updated_at = now()
   WHERE id = p_campaign_id;

  RETURN QUERY SELECT c.id, c.status FROM public.ad_campaigns c WHERE c.id = p_campaign_id;
END;
$$;

-- ==== 5. review_campaign RPC (admin approve/reject) ====
CREATE OR REPLACE FUNCTION public.review_campaign(
  p_campaign_id uuid,
  p_decision text,           -- 'approve' | 'reject'
  p_reason text DEFAULT NULL
)
RETURNS TABLE(id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_new_status text;
BEGIN
  IF NOT (has_role(v_actor,'admin'::app_role)
          OR has_role(v_actor,'super_admin'::app_role)
          OR is_owner(v_actor)
          OR is_marketer(v_actor)) THEN
    RAISE EXCEPTION 'Only admins/marketers can review campaigns' USING ERRCODE = '42501';
  END IF;

  IF p_decision NOT IN ('approve','reject') THEN
    RAISE EXCEPTION 'decision must be approve or reject' USING ERRCODE = '22023';
  END IF;

  v_new_status := CASE WHEN p_decision = 'approve' THEN 'active' ELSE 'rejected' END;

  UPDATE public.ad_campaigns
     SET status = v_new_status, updated_at = now()
   WHERE id = p_campaign_id;

  INSERT INTO public.audit_logs (actor_id, action, target_table, metadata)
  VALUES (v_actor, 'campaign_' || p_decision, 'ad_campaigns',
          jsonb_build_object('campaign_id', p_campaign_id, 'reason', p_reason));

  RETURN QUERY SELECT c.id, c.status FROM public.ad_campaigns c WHERE c.id = p_campaign_id;
END;
$$;

-- ==== 6. WALLET DEBIT for ad impressions ====
CREATE OR REPLACE FUNCTION public.debit_brand_for_impression(
  p_campaign_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_brand_id uuid;
  v_balance numeric;
BEGIN
  IF p_amount <= 0 THEN RETURN; END IF;

  SELECT brand_id INTO v_brand_id FROM public.ad_campaigns WHERE id = p_campaign_id;
  IF v_brand_id IS NULL THEN RETURN; END IF;

  SELECT balance INTO v_balance FROM public.brand_accounts WHERE id = v_brand_id FOR UPDATE;

  -- If balance insufficient, pause the campaign instead of going negative
  IF v_balance < p_amount THEN
    UPDATE public.ad_campaigns SET status = 'paused', updated_at = now() WHERE id = p_campaign_id;
    -- Notify brand
    INSERT INTO public.notifications (user_id, audience, brand_id, kind, title, body, link_url, metadata)
    SELECT bm.user_id, 'brand', v_brand_id, 'low_balance',
           'Campaign paused — wallet empty',
           'Top up your wallet to resume serving ads.',
           '/brand/billing',
           jsonb_build_object('campaign_id', p_campaign_id)
    FROM public.brand_members bm WHERE bm.brand_id = v_brand_id;
    RETURN;
  END IF;

  UPDATE public.brand_accounts
     SET balance = balance - p_amount, updated_at = now()
   WHERE id = v_brand_id;

  INSERT INTO public.brand_transactions (brand_id, amount, type, reference, notes)
  VALUES (v_brand_id, p_amount, 'debit', p_campaign_id::text, 'ad serve');

  UPDATE public.ad_campaigns
     SET budget_spent = COALESCE(budget_spent,0) + p_amount, updated_at = now()
   WHERE id = p_campaign_id;
END;
$$;

-- ==== 7. RLS HARDENING ====

-- 7a. Lock dob & age after first set (prevent minor → adult bypass)
CREATE OR REPLACE FUNCTION public.lock_immutable_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean := has_role(auth.uid(),'admin'::app_role)
                       OR has_role(auth.uid(),'super_admin'::app_role)
                       OR is_owner(auth.uid());
BEGIN
  IF v_is_admin OR current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Once set, dob cannot change
  IF OLD.dob IS NOT NULL AND OLD.dob <> '' AND NEW.dob IS DISTINCT FROM OLD.dob THEN
    RAISE EXCEPTION 'Date of birth cannot be changed. Contact support.' USING ERRCODE = '42501';
  END IF;

  -- Once set, age cannot change to bypass minor block
  IF OLD.age IS NOT NULL AND NEW.age IS DISTINCT FROM OLD.age AND OLD.age < 18 AND NEW.age >= 18 THEN
    RAISE EXCEPTION 'Age cannot be modified to bypass age verification.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_immutable ON public.profiles;
CREATE TRIGGER trg_profile_immutable
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_immutable_profile_fields();

-- 7b. Restrict payment_events: revoke marketer/support read
DROP POLICY IF EXISTS "Staff read all payment events" ON public.payment_events;

-- 7c. Lock brand_members.role escalation (only admins can change role)
CREATE OR REPLACE FUNCTION public.guard_brand_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN RETURN NEW; END IF;
  IF has_role(auth.uid(),'admin'::app_role)
     OR has_role(auth.uid(),'super_admin'::app_role)
     OR is_owner(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- Brand owners (role='owner') can change roles within their brand
  IF EXISTS (
    SELECT 1 FROM public.brand_members
    WHERE brand_id = NEW.brand_id AND user_id = auth.uid() AND role = 'owner'
  ) THEN
    -- but cannot promote anyone to a role higher than their own (still 'owner')
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Only admins or brand owners can change member roles' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_brand_member_role_guard ON public.brand_members;
CREATE TRIGGER trg_brand_member_role_guard
  BEFORE INSERT OR UPDATE OF role ON public.brand_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_brand_member_role();

-- ==== 8. Helper: check brand member role from app code ====
CREATE OR REPLACE FUNCTION public.brand_member_role(_brand_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT role FROM public.brand_members
  WHERE brand_id = _brand_id AND user_id = auth.uid()
  LIMIT 1;
$$;
