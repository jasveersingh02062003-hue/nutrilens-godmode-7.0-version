-- ============================================================
-- Subscriptions + Payment Events (provider-agnostic core)
-- ============================================================

-- Enums
CREATE TYPE public.subscription_plan AS ENUM ('free', 'premium', 'ultra');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trialing', 'past_due');
CREATE TYPE public.payment_provider AS ENUM ('mock', 'razorpay', 'stripe');

-- ============== subscriptions ==============
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan public.subscription_plan NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  has_used_trial boolean NOT NULL DEFAULT false,
  provider public.payment_provider NOT NULL DEFAULT 'mock',
  provider_subscription_id text,
  provider_customer_id text,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON public.subscriptions(current_period_end)
  WHERE status IN ('active', 'trialing');

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
ON public.subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins read all subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- No INSERT/UPDATE/DELETE policies for authenticated → only service_role can write.

CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============== payment_events ==============
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'subscribe', 'cancel', 'renew', 'payment_failed', 'expired', 'trial_started', 'trial_ended', 'plan_changed'
  )),
  provider public.payment_provider NOT NULL DEFAULT 'mock',
  provider_event_id text,
  amount_inr numeric DEFAULT 0,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX idx_payment_events_user_id ON public.payment_events(user_id);
CREATE INDEX idx_payment_events_subscription_id ON public.payment_events(subscription_id);
CREATE INDEX idx_payment_events_created_at ON public.payment_events(created_at DESC);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own payment events"
ON public.payment_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins read all payment events"
ON public.payment_events FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- No write policies for authenticated → service_role only.

-- ============== get_my_active_plan() RPC ==============
CREATE OR REPLACE FUNCTION public.get_my_active_plan()
RETURNS TABLE (
  plan public.subscription_plan,
  status public.subscription_status,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  has_used_trial boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT s.plan, s.status, s.trial_end, s.current_period_end, s.cancel_at_period_end, s.has_used_trial
  FROM public.subscriptions s
  WHERE s.user_id = v_user;

  -- If no row, return a synthetic "free/active" tuple so callers always get something
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'free'::public.subscription_plan,
      'active'::public.subscription_status,
      NULL::timestamptz,
      NULL::timestamptz,
      false,
      false;
  END IF;
END;
$$;

-- ============== start_trial() RPC ==============
CREATE OR REPLACE FUNCTION public.start_trial()
RETURNS TABLE (
  plan public.subscription_plan,
  status public.subscription_status,
  trial_end timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_trial_end timestamptz := now() + interval '3 days';
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Atomic upsert: only succeed if user has never used trial
  INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end, trial_end, has_used_trial, provider)
  VALUES (v_user, 'premium', 'trialing', now(), v_trial_end, v_trial_end, true, 'mock')
  ON CONFLICT (user_id) DO UPDATE
  SET plan = 'premium',
      status = 'trialing',
      current_period_start = now(),
      current_period_end = v_trial_end,
      trial_end = v_trial_end,
      has_used_trial = true,
      updated_at = now()
  WHERE public.subscriptions.has_used_trial = false
    AND public.subscriptions.plan = 'free';

  -- If nothing changed (already used trial), raise
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trial already used or active subscription exists' USING ERRCODE = '23505';
  END IF;

  -- Audit
  INSERT INTO public.payment_events (user_id, subscription_id, event_type, provider, raw_payload)
  SELECT v_user, s.id, 'trial_started', 'mock', jsonb_build_object('trial_end', v_trial_end)
  FROM public.subscriptions s WHERE s.user_id = v_user;

  RETURN QUERY
  SELECT s.plan, s.status, s.trial_end
  FROM public.subscriptions s WHERE s.user_id = v_user;
END;
$$;

-- ============== handle_new_user_subscription trigger ==============
-- Replace the existing handle_new_user to also create a free subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, status, provider)
  VALUES (NEW.id, 'free', 'active', 'mock')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill: ensure every existing user has a subscription row
INSERT INTO public.subscriptions (user_id, plan, status, provider)
SELECT p.id, 'free'::public.subscription_plan, 'active'::public.subscription_status, 'mock'::public.payment_provider
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

-- ============== cancel_my_subscription() RPC (works for mock + future providers) ==============
CREATE OR REPLACE FUNCTION public.cancel_my_subscription()
RETURNS TABLE (
  status public.subscription_status,
  current_period_end timestamptz,
  cancel_at_period_end boolean
)
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

  UPDATE public.subscriptions s
  SET cancel_at_period_end = true, updated_at = now()
  WHERE s.user_id = v_user
    AND s.status IN ('active', 'trialing');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active subscription to cancel' USING ERRCODE = '02000';
  END IF;

  INSERT INTO public.payment_events (user_id, subscription_id, event_type, provider, raw_payload)
  SELECT v_user, s.id, 'cancel', s.provider, jsonb_build_object('cancelled_at', now())
  FROM public.subscriptions s WHERE s.user_id = v_user;

  RETURN QUERY
  SELECT s.status, s.current_period_end, s.cancel_at_period_end
  FROM public.subscriptions s WHERE s.user_id = v_user;
END;
$$;