

# P2 Remaining Items — Implementation Plan

Wrapping up the leftover P2 work. Split into **what I can build** vs **what needs you to click around outside the app**.

---

## What I'll Build (Code Changes)

### 1. Schedule the photo-purge cron (P2-2 finish)

The `purge-old-photos` edge function exists but never runs automatically. I'll create a migration that:
- Generates a random `PURGE_PHOTOS_SECRET` and stores it in Supabase Vault
- Schedules `pg_cron` to call the function **daily at 03:00 IST** with the secret in `x-cron-secret`
- Uses `net.http_post` (extension already enabled)

**Result:** Old photos auto-delete every night with zero manual work.

---

### 2. Failed-renewal dunning emails (P2-11)

Two parts:

**A. Webhook handler** — extend `payments-webhook/index.ts` to handle `transaction.payment_failed`:
- Look up user by `paddle_customer_id`
- Insert row into a new `dunning_events` table (`user_id, attempt_number, next_retry_at, status`)
- Trigger transactional email

**B. Transactional email infrastructure**
- Run email infra setup + scaffold transactional emails (Lovable Cloud built-in)
- Create one template: `payment-failed.tsx` with empathetic copy, "Update Card" CTA → Paddle customer portal URL
- Add a second template: `payment-recovered.tsx` for when retry succeeds (fires on `subscription.updated` going `past_due` → `active`)

**Prerequisite:** Needs an email domain set up. I'll show the email-domain setup dialog if not configured.

**Result:** Paddle silently retries; we proactively email user "Hey, card failed — update in 1 click."

---

### 3. Branded `payment-failed` UI banner (bonus, free with #2)

Add a `PaymentFailedBanner` component on Dashboard that shows when `subscriptions.status = 'past_due'`, links to customer portal. Catches users who don't open email.

---

## What You Need to Do (External — ~30 min total)

I can't do these from inside Lovable. I'll give you exact step-by-step instructions in chat after the code is done.

### 4. Sentry alert routing (P2-6) — **5 min**
1. Open https://sentry.io → your NutriLens project → Alerts → Create Alert
2. Two rules to create:
   - **"New issue"** → email you on first occurrence of any new error
   - **"Issue frequency spike"** → email if same error >10 times in 1 hour
3. I'll give you the exact JSON config to paste

### 5. UptimeRobot (P2-7) — **10 min**
1. Sign up free at https://uptimerobot.com
2. Add new monitor: HTTP(s), URL = `https://yowgmqdcmgaiaqjgifzh.supabase.co/functions/v1/healthz`, interval = 5 min
3. Add your email/SMS as alert contact
4. Optionally add Slack webhook

### 6. Backup restore drill (P2-8) — **2 hours, one-time**
- Already documented in `docs/BACKUP_RESTORE.md`
- I'll add a **simplified quick-drill checklist** (`docs/backup-drill-quickstart.md`) with commands you can copy-paste
- You run it once, log result in `docs/backup-drill-log.md`

### 7. Staging environment (P2-9) — **DEFERRED**
**My recommendation: skip until 500+ active users.** Reasons:
- Doubles your Lovable bill
- Adds friction to every fix (you'd push to staging → test → push to prod)
- Solo founder + low traffic = staging slows you down more than it helps
- Lovable's preview URLs already give you per-change testing

If you want it anyway, it's literally one click — **Project Settings → Remix** in Lovable. Takes 30 sec.

---

## Technical Details

**Files I'll create:**
- `supabase/migrations/<timestamp>_schedule_photo_purge.sql` — cron job + vault secret
- `supabase/migrations/<timestamp>_dunning_events_table.sql` — tracking table with RLS
- `supabase/functions/_shared/transactional-email-templates/payment-failed.tsx`
- `supabase/functions/_shared/transactional-email-templates/payment-recovered.tsx`
- `src/components/PaymentFailedBanner.tsx`
- `docs/backup-drill-quickstart.md`
- `docs/external-monitoring-setup.md` — Sentry + UptimeRobot click-by-click guide

**Files I'll modify:**
- `supabase/functions/payments-webhook/index.ts` — add `transaction.payment_failed` + `subscription.updated` past_due→active handling
- `src/pages/Dashboard.tsx` — mount `PaymentFailedBanner`

**Database:**
```sql
create table dunning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  paddle_subscription_id text,
  attempt_number int not null,
  failure_reason text,
  email_sent_at timestamptz,
  recovered_at timestamptz,
  created_at timestamptz default now()
);
alter table dunning_events enable row level security;
create policy "users see own dunning" on dunning_events
  for select using (user_id = auth.uid());
-- only service_role writes (webhook)
```

---

## Execution Order (when you approve)

1. **Cron schedule for purge** — pure SQL, 5 min
2. **Email domain check** — if missing, I'll show setup dialog
3. **Dunning system** — webhook + 2 templates + banner + table — ~30 min
4. **Quickstart docs** — backup drill + external monitoring guides — ~10 min
5. **Hand off to you:** Sentry + UptimeRobot setup (I'll wait & verify with `curl` after you're done)

**Total active build time: ~45 min. External clicks for you: ~15 min.**

---

## Reply Options

- **"go"** — do all the above in the order listed
- **"skip dunning"** — only do cron + docs (if you want to defer email work)
- **"just cron"** — only schedule the photo purge, defer everything else
- **"change order: X first"** — reshuffle priorities

