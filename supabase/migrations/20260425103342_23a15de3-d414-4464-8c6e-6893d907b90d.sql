CREATE INDEX IF NOT EXISTS idx_events_name_created
  ON public.events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_user_created
  ON public.events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;