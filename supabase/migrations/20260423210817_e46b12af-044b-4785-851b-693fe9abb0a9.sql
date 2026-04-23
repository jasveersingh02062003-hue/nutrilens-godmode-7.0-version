-- One-time backfill: mirror any pre-existing payment_events rows into audit_logs
-- so the admin audit feed is consistent with rows the trigger captures going forward.
INSERT INTO public.audit_logs (actor_id, action, target_table, target_user_id, metadata, created_at)
SELECT
  pe.user_id,
  'payment_' || pe.event_type,
  'payment_events',
  pe.user_id,
  jsonb_build_object(
    'amount_inr', pe.amount_inr,
    'provider', pe.provider,
    'subscription_id', pe.subscription_id,
    'event_id', pe.id,
    'payload', pe.raw_payload,
    'backfilled', true
  ),
  pe.created_at
FROM public.payment_events pe
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_logs al
  WHERE al.target_table = 'payment_events'
    AND (al.metadata->>'event_id')::uuid = pe.id
);