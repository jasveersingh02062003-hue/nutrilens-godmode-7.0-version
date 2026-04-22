CREATE TABLE public.price_alert_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_id uuid,
  item_name text NOT NULL,
  city text NOT NULL,
  current_price numeric NOT NULL,
  threshold_price numeric NOT NULL,
  direction text NOT NULL DEFAULT 'below',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_alert_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
ON public.price_alert_notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.price_alert_notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.price_alert_notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
ON public.price_alert_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE INDEX idx_price_alert_notifications_user_unread
ON public.price_alert_notifications (user_id, is_read, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.price_alert_notifications;
ALTER TABLE public.price_alert_notifications REPLICA IDENTITY FULL;