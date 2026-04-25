CREATE OR REPLACE FUNCTION public.get_funnel_counts(p_days integer DEFAULT 30)
RETURNS TABLE(
  step_key text,
  user_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  -- Authorization: only admins / marketers (mirrors events SELECT policies)
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR is_owner(auth.uid())
    OR is_marketer(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges' USING ERRCODE = '42501';
  END IF;

  -- Distinct users per tracked event in the window
  RETURN QUERY
  SELECT e.event_name::text AS step_key,
         COUNT(DISTINCT e.user_id)::bigint AS user_count
  FROM public.events e
  WHERE e.event_name IN (
          'signup',
          'onboarding_complete',
          'first_meal_logged',
          'activated',
          'paywall_viewed',
          'subscription_started'
        )
    AND e.created_at >= v_since
    AND e.user_id IS NOT NULL
  GROUP BY e.event_name;

  -- 7-day retention: signed up in window AND has app_opened/meal_logged ≥ 7d after signup
  RETURN QUERY
  WITH signups AS (
    SELECT user_id, MIN(created_at) AS signup_at
    FROM public.events
    WHERE event_name = 'signup'
      AND created_at >= v_since
      AND user_id IS NOT NULL
    GROUP BY user_id
  ),
  retained AS (
    SELECT DISTINCT s.user_id
    FROM signups s
    JOIN public.events e ON e.user_id = s.user_id
    WHERE e.event_name IN ('app_opened', 'meal_logged', 'first_meal_logged')
      AND e.created_at >= s.signup_at + interval '7 days'
  )
  SELECT 'retained_7d'::text AS step_key,
         COUNT(*)::bigint AS user_count
  FROM retained;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_funnel_counts(integer) TO authenticated;