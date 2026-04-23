-- P1: Pause / Resume RPCs
CREATE OR REPLACE FUNCTION public.pause_my_subscription(p_days integer DEFAULT 30)
RETURNS TABLE(status public.subscription_status, current_period_end timestamptz, paused_until timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_pause_until timestamptz;
  v_current_end timestamptz;
  v_new_end timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_days NOT IN (7, 14, 30) THEN
    RAISE EXCEPTION 'Pause duration must be 7, 14 or 30 days' USING ERRCODE = '22023';
  END IF;

  v_pause_until := now() + (p_days || ' days')::interval;

  -- Read current period end
  SELECT s.current_period_end INTO v_current_end
  FROM public.subscriptions s WHERE s.user_id = v_user
  AND s.status IN ('active','trialing')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active subscription to pause' USING ERRCODE = '02000';
  END IF;

  -- Extend the period end by the pause window so user doesn't lose paid time
  v_new_end := COALESCE(v_current_end, now()) + (p_days || ' days')::interval;

  UPDATE public.subscriptions s
  SET status = 'paused'::public.subscription_status,
      current_period_end = v_new_end,
      updated_at = now()
  WHERE s.user_id = v_user;

  INSERT INTO public.payment_events (user_id, subscription_id, event_type, provider, raw_payload)
  SELECT v_user, s.id, 'pause', s.provider,
         jsonb_build_object('paused_until', v_pause_until, 'days', p_days, 'new_period_end', v_new_end)
  FROM public.subscriptions s WHERE s.user_id = v_user;

  RETURN QUERY
  SELECT s.status, s.current_period_end, v_pause_until
  FROM public.subscriptions s WHERE s.user_id = v_user;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resume_my_subscription()
RETURNS TABLE(status public.subscription_status, current_period_end timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.subscriptions s
  SET status = 'active'::public.subscription_status,
      updated_at = now()
  WHERE s.user_id = v_user
    AND s.status = 'paused'::public.subscription_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No paused subscription to resume' USING ERRCODE = '02000';
  END IF;

  INSERT INTO public.payment_events (user_id, subscription_id, event_type, provider, raw_payload)
  SELECT v_user, s.id, 'resume', s.provider, jsonb_build_object('resumed_at', now())
  FROM public.subscriptions s WHERE s.user_id = v_user;

  RETURN QUERY
  SELECT s.status, s.current_period_end
  FROM public.subscriptions s WHERE s.user_id = v_user;
END;
$function$;