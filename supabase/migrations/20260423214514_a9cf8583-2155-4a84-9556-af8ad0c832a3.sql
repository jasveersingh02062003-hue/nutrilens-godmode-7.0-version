-- 1. Drop the implicit unique(user_id) constraint so users can have multiple subscription rows
-- (paddle webhooks key on paddle_subscription_id; re-subscribing should create a new row, not overwrite)
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;

-- 2. Add Paddle-specific columns
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS product_id_ext text,
  ADD COLUMN IF NOT EXISTS price_id_ext text;

-- 3. Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_env_created
  ON public.subscriptions(user_id, environment, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_sub_id
  ON public.subscriptions(paddle_subscription_id)
  WHERE paddle_subscription_id IS NOT NULL;

-- 4. Server-side active subscription check (safety net for sensitive ops)
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'live'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'cancelled' AND current_period_end > now())
      )
  );
$$;

-- 5. Update get_my_active_plan to return the most recent row (handles multi-row users)
CREATE OR REPLACE FUNCTION public.get_my_active_plan()
 RETURNS TABLE(plan subscription_plan, status subscription_status, trial_end timestamp with time zone, current_period_end timestamp with time zone, cancel_at_period_end boolean, has_used_trial boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT s.plan, s.status, s.trial_end, s.current_period_end, s.cancel_at_period_end, s.has_used_trial
  FROM public.subscriptions s
  WHERE s.user_id = v_user
  ORDER BY s.created_at DESC
  LIMIT 1;

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
$function$;

-- 6. Update cancel_my_subscription — operate on most recent active row only
CREATE OR REPLACE FUNCTION public.cancel_my_subscription()
 RETURNS TABLE(status subscription_status, current_period_end timestamp with time zone, cancel_at_period_end boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_sub_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT s.id INTO v_sub_id
  FROM public.subscriptions s
  WHERE s.user_id = v_user
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_sub_id IS NULL THEN
    RAISE EXCEPTION 'No active subscription to cancel' USING ERRCODE = '02000';
  END IF;

  UPDATE public.subscriptions
  SET cancel_at_period_end = true, updated_at = now()
  WHERE id = v_sub_id;

  INSERT INTO public.payment_events (user_id, subscription_id, event_type, provider, raw_payload)
  SELECT v_user, s.id, 'cancel', s.provider, jsonb_build_object('cancelled_at', now())
  FROM public.subscriptions s WHERE s.id = v_sub_id;

  RETURN QUERY
  SELECT s.status, s.current_period_end, s.cancel_at_period_end
  FROM public.subscriptions s WHERE s.id = v_sub_id;
END;
$function$;

-- 7. Update pause_my_subscription
CREATE OR REPLACE FUNCTION public.pause_my_subscription(p_days integer DEFAULT 30)
 RETURNS TABLE(status subscription_status, current_period_end timestamp with time zone, paused_until timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_pause_until timestamptz;
  v_current_end timestamptz;
  v_new_end timestamptz;
  v_sub_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_days NOT IN (7, 14, 30) THEN
    RAISE EXCEPTION 'Pause duration must be 7, 14 or 30 days' USING ERRCODE = '22023';
  END IF;

  v_pause_until := now() + (p_days || ' days')::interval;

  SELECT s.id, s.current_period_end INTO v_sub_id, v_current_end
  FROM public.subscriptions s
  WHERE s.user_id = v_user AND s.status IN ('active','trialing')
  ORDER BY s.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_sub_id IS NULL THEN
    RAISE EXCEPTION 'No active subscription to pause' USING ERRCODE = '02000';
  END IF;

  v_new_end := COALESCE(v_current_end, now()) + (p_days || ' days')::interval;

  UPDATE public.subscriptions
  SET status = 'paused'::public.subscription_status,
      current_period_end = v_new_end,
      updated_at = now()
  WHERE id = v_sub_id;

  INSERT INTO public.payment_events (user_id, subscription_id, event_type, provider, raw_payload)
  SELECT v_user, s.id, 'pause', s.provider,
         jsonb_build_object('paused_until', v_pause_until, 'days', p_days, 'new_period_end', v_new_end)
  FROM public.subscriptions s WHERE s.id = v_sub_id;

  RETURN QUERY
  SELECT s.status, s.current_period_end, v_pause_until
  FROM public.subscriptions s WHERE s.id = v_sub_id;
END;
$function$;

-- 8. Update resume_my_subscription
CREATE OR REPLACE FUNCTION public.resume_my_subscription()
 RETURNS TABLE(status subscription_status, current_period_end timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_sub_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT s.id INTO v_sub_id
  FROM public.subscriptions s
  WHERE s.user_id = v_user AND s.status = 'paused'::public.subscription_status
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_sub_id IS NULL THEN
    RAISE EXCEPTION 'No paused subscription to resume' USING ERRCODE = '02000';
  END IF;

  UPDATE public.subscriptions
  SET status = 'active'::public.subscription_status, updated_at = now()
  WHERE id = v_sub_id;

  INSERT INTO public.payment_events (user_id, subscription_id, event_type, provider, raw_payload)
  SELECT v_user, s.id, 'resume', s.provider, jsonb_build_object('resumed_at', now())
  FROM public.subscriptions s WHERE s.id = v_sub_id;

  RETURN QUERY
  SELECT s.status, s.current_period_end
  FROM public.subscriptions s WHERE s.id = v_sub_id;
END;
$function$;

-- 9. Update start_trial — check for any existing premium row before granting
CREATE OR REPLACE FUNCTION public.start_trial()
 RETURNS TABLE(plan subscription_plan, status subscription_status, trial_end timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_trial_end timestamptz := now() + interval '3 days';
  v_already_used boolean;
  v_sub_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Check if any row indicates trial used or active premium exists
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = v_user
      AND (has_used_trial = true OR (plan <> 'free' AND status IN ('active','trialing')))
  ) INTO v_already_used;

  IF v_already_used THEN
    RAISE EXCEPTION 'Trial already used or active subscription exists' USING ERRCODE = '23505';
  END IF;

  -- Update the most recent free row in place (typically the one created by handle_new_user)
  SELECT id INTO v_sub_id FROM public.subscriptions
  WHERE user_id = v_user
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_sub_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET plan = 'premium', status = 'trialing',
        current_period_start = now(), current_period_end = v_trial_end,
        trial_end = v_trial_end, has_used_trial = true,
        updated_at = now()
    WHERE id = v_sub_id;
  ELSE
    INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end, trial_end, has_used_trial, provider)
    VALUES (v_user, 'premium', 'trialing', now(), v_trial_end, v_trial_end, true, 'mock')
    RETURNING id INTO v_sub_id;
  END IF;

  INSERT INTO public.payment_events (user_id, subscription_id, event_type, provider, raw_payload)
  VALUES (v_user, v_sub_id, 'trial_started', 'mock', jsonb_build_object('trial_end', v_trial_end));

  RETURN QUERY
  SELECT s.plan, s.status, s.trial_end
  FROM public.subscriptions s WHERE s.id = v_sub_id;
END;
$function$;

-- 10. Update admin_set_subscription — operate on most recent row, or create new
CREATE OR REPLACE FUNCTION public.admin_set_subscription(p_user_id uuid, p_plan subscription_plan, p_status subscription_status, p_period_days integer DEFAULT 30, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(plan subscription_plan, status subscription_status, current_period_end timestamp with time zone, cancel_at_period_end boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_period_end timestamptz := now() + (p_period_days || ' days')::interval;
  v_sub_id uuid;
BEGIN
  IF NOT (
    has_role(v_actor, 'admin'::app_role)
    OR has_role(v_actor, 'super_admin'::app_role)
    OR is_owner(v_actor)
  ) THEN
    RAISE EXCEPTION 'Only admins can adjust subscriptions' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_sub_id FROM public.subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_sub_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET plan = p_plan, status = p_status,
        current_period_start = now(), current_period_end = v_period_end,
        cancel_at_period_end = false, updated_at = now()
    WHERE id = v_sub_id;
  ELSE
    INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end, provider, has_used_trial)
    VALUES (p_user_id, p_plan, p_status, now(), v_period_end, 'mock', false)
    RETURNING id INTO v_sub_id;
  END IF;

  INSERT INTO public.payment_events (user_id, event_type, provider, raw_payload)
  VALUES (
    p_user_id,
    CASE WHEN p_status = 'cancelled' THEN 'admin_cancel'
         WHEN p_plan = 'free' THEN 'admin_downgrade'
         ELSE 'admin_comp' END,
    'mock',
    jsonb_build_object('actor_id', v_actor, 'reason', p_reason, 'plan', p_plan, 'status', p_status, 'period_days', p_period_days)
  );

  INSERT INTO public.audit_logs (actor_id, action, target_table, target_user_id, metadata)
  VALUES (v_actor, 'subscription_admin_change', 'subscriptions', p_user_id,
    jsonb_build_object('reason', p_reason, 'plan', p_plan, 'status', p_status, 'period_days', p_period_days));

  RETURN QUERY
  SELECT s.plan, s.status, s.current_period_end, s.cancel_at_period_end
  FROM public.subscriptions s WHERE s.id = v_sub_id;
END;
$function$;

-- 11. Update handle_new_user — keep existing behaviour but ensure it still works with multi-row schema
-- (no change needed; INSERT ... ON CONFLICT (user_id) DO NOTHING was relying on the unique constraint we dropped)
-- Replace with explicit existence check
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id) THEN
    INSERT INTO public.subscriptions (user_id, plan, status, provider)
    VALUES (NEW.id, 'free', 'active', 'mock');
  END IF;

  RETURN NEW;
END;
$function$;