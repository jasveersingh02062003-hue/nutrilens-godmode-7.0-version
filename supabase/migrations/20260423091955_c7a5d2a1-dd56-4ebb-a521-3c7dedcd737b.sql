-- ============================================================
-- 1. AI usage quota table for server-side rate enforcement
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_quota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  endpoint text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_quota_user_date
  ON public.ai_usage_quota (user_id, usage_date);

ALTER TABLE public.ai_usage_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own quota"
  ON public.ai_usage_quota FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all quota"
  ON public.ai_usage_quota FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Atomic increment helper. Returns the new count after increment.
-- SECURITY DEFINER so edge functions (and authed users) can call it,
-- but it always uses auth.uid() so users cannot inflate someone else's counter.
CREATE OR REPLACE FUNCTION public.increment_ai_quota(p_endpoint text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.ai_usage_quota (user_id, usage_date, endpoint, count)
  VALUES (v_user, CURRENT_DATE, p_endpoint, 1)
  ON CONFLICT (user_id, usage_date, endpoint)
  DO UPDATE SET count = public.ai_usage_quota.count + 1,
                updated_at = now()
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

-- Read helper for clients that want to display "X of Y used today"
CREATE OR REPLACE FUNCTION public.get_ai_quota(p_endpoint text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT count
     FROM public.ai_usage_quota
     WHERE user_id = auth.uid()
       AND usage_date = CURRENT_DATE
       AND endpoint = p_endpoint),
    0
  );
$$;

-- ============================================================
-- 2. Account deletion RPC (DPDP Act compliance)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Cascade-delete every table that holds personal data.
  -- Order matters only where FKs without ON DELETE CASCADE exist; here
  -- everything is keyed on user_id so order is safe.
  DELETE FROM public.daily_logs            WHERE user_id = v_user;
  DELETE FROM public.weight_logs           WHERE user_id = v_user;
  DELETE FROM public.water_logs            WHERE user_id = v_user;
  DELETE FROM public.supplement_logs       WHERE user_id = v_user;
  DELETE FROM public.event_plans           WHERE user_id = v_user;
  DELETE FROM public.user_achievements     WHERE user_id = v_user;
  DELETE FROM public.monika_conversations  WHERE user_id = v_user;
  DELETE FROM public.consent_records       WHERE user_id = v_user;
  DELETE FROM public.feedback              WHERE user_id = v_user;
  DELETE FROM public.price_alerts          WHERE user_id = v_user;
  DELETE FROM public.price_alert_notifications WHERE user_id = v_user;
  DELETE FROM public.price_reports         WHERE user_id = v_user;
  DELETE FROM public.ai_usage_quota        WHERE user_id = v_user;
  DELETE FROM public.ad_clicks             WHERE user_id = v_user;
  DELETE FROM public.ad_impressions        WHERE user_id = v_user;
  DELETE FROM public.ad_conversions        WHERE user_id = v_user;
  DELETE FROM public.events                WHERE user_id = v_user;
  DELETE FROM public.user_roles            WHERE user_id = v_user;
  DELETE FROM public.profiles              WHERE id = v_user;

  -- Audit trail (cannot reference the deleted user; store id in metadata)
  INSERT INTO public.audit_logs (actor_id, action, target_user_id, target_table, metadata)
  VALUES (v_user, 'account_self_deleted', v_user, 'profiles',
          jsonb_build_object('deleted_at', now()));

  -- Finally remove the auth.users row. Requires SECURITY DEFINER + service role
  -- privileges. Supabase grants the postgres role this access.
  DELETE FROM auth.users WHERE id = v_user;
END;
$$;

-- ============================================================
-- 3. Lock down ad campaign competitive intel
-- ============================================================
-- Drop the over-permissive "Authenticated can read all campaigns" policy
DROP POLICY IF EXISTS "Authenticated can read all campaigns" ON public.ad_campaigns;
DROP POLICY IF EXISTS "Authenticated can read all creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Authenticated can read impressions" ON public.ad_impressions;
DROP POLICY IF EXISTS "Authenticated can read clicks" ON public.ad_clicks;
DROP POLICY IF EXISTS "Authenticated can read conversions" ON public.ad_conversions;
DROP POLICY IF EXISTS "Anyone can read targeting" ON public.ad_targeting;

-- Helper: any staff role
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    has_role(_user_id, 'admin'::app_role)
    OR has_role(_user_id, 'super_admin'::app_role)
    OR is_owner(_user_id)
    OR is_marketer(_user_id)
    OR is_support(_user_id)
$$;

-- Brand-scoped reads only (the existing "Anyone can read active campaigns"
-- policy still lets the ad-serving edge function and frontend display ACTIVE
-- ads to all users, which is what we want).
CREATE POLICY "Brand or staff read campaigns"
  ON public.ad_campaigns FOR SELECT
  TO authenticated
  USING (is_brand_member(brand_id) OR is_staff(auth.uid()));

CREATE POLICY "Brand or staff read creatives"
  ON public.ad_creatives FOR SELECT
  TO authenticated
  USING (
    is_brand_member(campaign_brand_id(campaign_id))
    OR is_staff(auth.uid())
  );

CREATE POLICY "Brand or staff read impressions"
  ON public.ad_impressions FOR SELECT
  TO authenticated
  USING (
    is_brand_member(campaign_brand_id(campaign_id))
    OR is_staff(auth.uid())
  );

CREATE POLICY "Brand or staff read clicks"
  ON public.ad_clicks FOR SELECT
  TO authenticated
  USING (
    is_brand_member(campaign_brand_id(campaign_id))
    OR is_staff(auth.uid())
  );

CREATE POLICY "Brand or staff read conversions"
  ON public.ad_conversions FOR SELECT
  TO authenticated
  USING (
    is_brand_member(campaign_brand_id(campaign_id))
    OR is_staff(auth.uid())
  );

CREATE POLICY "Brand or staff read targeting"
  ON public.ad_targeting FOR SELECT
  TO authenticated
  USING (
    is_brand_member(campaign_brand_id(campaign_id))
    OR is_staff(auth.uid())
  );