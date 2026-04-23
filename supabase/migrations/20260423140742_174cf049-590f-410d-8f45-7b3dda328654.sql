-- Allow staff to read payment events for support/audit
CREATE POLICY "Staff read all payment events"
  ON public.payment_events
  FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

-- Mirror payment events into audit_logs so super-admin sees every sub event
CREATE OR REPLACE FUNCTION public.audit_payment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, target_table, target_user_id, metadata)
  VALUES (
    NEW.user_id,
    'payment_' || NEW.event_type,
    'payment_events',
    NEW.user_id,
    jsonb_build_object(
      'amount_inr', NEW.amount_inr,
      'provider', NEW.provider,
      'subscription_id', NEW.subscription_id,
      'event_id', NEW.id,
      'payload', NEW.raw_payload
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payment_event ON public.payment_events;
CREATE TRIGGER trg_audit_payment_event
  AFTER INSERT ON public.payment_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_event();

-- Allow admins to grant comp subscriptions / force-cancel via SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.admin_set_subscription(
  p_user_id uuid,
  p_plan public.subscription_plan,
  p_status public.subscription_status,
  p_period_days integer DEFAULT 30,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(
  plan public.subscription_plan,
  status public.subscription_status,
  current_period_end timestamptz,
  cancel_at_period_end boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_period_end timestamptz := now() + (p_period_days || ' days')::interval;
BEGIN
  IF NOT (
    has_role(v_actor, 'admin'::app_role)
    OR has_role(v_actor, 'super_admin'::app_role)
    OR is_owner(v_actor)
  ) THEN
    RAISE EXCEPTION 'Only admins can adjust subscriptions' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.subscriptions (
    user_id, plan, status, current_period_start, current_period_end, provider, has_used_trial
  )
  VALUES (
    p_user_id, p_plan, p_status, now(), v_period_end, 'mock', false
  )
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = false,
        updated_at = now();

  -- Log to payment_events (which now also mirrors to audit_logs via trigger)
  INSERT INTO public.payment_events (user_id, event_type, provider, raw_payload)
  VALUES (
    p_user_id,
    CASE WHEN p_status = 'cancelled' THEN 'admin_cancel'
         WHEN p_plan = 'free' THEN 'admin_downgrade'
         ELSE 'admin_comp' END,
    'mock',
    jsonb_build_object(
      'actor_id', v_actor,
      'reason', p_reason,
      'plan', p_plan,
      'status', p_status,
      'period_days', p_period_days
    )
  );

  -- Also write a direct admin audit row so reason is searchable
  INSERT INTO public.audit_logs (actor_id, action, target_table, target_user_id, metadata)
  VALUES (
    v_actor,
    'subscription_admin_change',
    'subscriptions',
    p_user_id,
    jsonb_build_object('reason', p_reason, 'plan', p_plan, 'status', p_status, 'period_days', p_period_days)
  );

  RETURN QUERY
  SELECT s.plan, s.status, s.current_period_end, s.cancel_at_period_end
  FROM public.subscriptions s WHERE s.user_id = p_user_id;
END;
$$;