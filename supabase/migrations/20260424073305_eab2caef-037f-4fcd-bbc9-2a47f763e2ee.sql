-- Enable required extensions for scheduled HTTP calls
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Schedule daily photo purge at 21:30 UTC (03:00 IST)
-- Calls the purge-old-photos edge function which deletes meal photos older than 90 days
select
  cron.schedule(
    'purge-old-meal-photos-daily',
    '30 21 * * *',
    $$
    select
      net.http_post(
          url:='https://yowgmqdcmgaiaqjgifzh.supabase.co/functions/v1/purge-old-photos',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvd2dtcWRjbWdhaWFxamdpZnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTcwOTIsImV4cCI6MjA5MDc5MzA5Mn0.xORyGJhUu315a0RKJD75YJJ-wRV3mLw-9ixyuhjRMEc"}'::jsonb,
          body:=concat('{"triggered_at": "', now(), '"}')::jsonb
      ) as request_id;
    $$
  );

-- Create dunning_events table for tracking failed payment retries
create table public.dunning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paddle_subscription_id text,
  paddle_customer_id text,
  attempt_number int not null default 1,
  failure_reason text,
  email_sent_at timestamptz,
  recovered_at timestamptz,
  raw_payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_dunning_events_user on public.dunning_events(user_id, created_at desc);
create index idx_dunning_events_subscription on public.dunning_events(paddle_subscription_id) where paddle_subscription_id is not null;

alter table public.dunning_events enable row level security;

-- Users can see their own dunning history (for "show past failed payments" UI)
create policy "Users view own dunning events"
  on public.dunning_events for select
  using (auth.uid() = user_id);

-- Only service role (webhook) writes
create policy "Service role writes dunning events"
  on public.dunning_events for insert
  with check (auth.role() = 'service_role');

create policy "Service role updates dunning events"
  on public.dunning_events for update
  using (auth.role() = 'service_role');