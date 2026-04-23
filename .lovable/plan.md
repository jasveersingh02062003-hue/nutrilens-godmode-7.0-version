# 📊 NutriLens AI — Progress Report & Recovery Plan

_Last updated: 2026-04-23 — context: 8F42B1C3-5D9E-4A7B-B2E1-9C3F4D5A6E7B_

---

## ✅ COMPLETED

### Security & RLS (Sprint 1)
- ✅ SEC-1: 9 permissive RLS policies tightened (city_prices, packed_products, price_history, ad_creatives, price_alert_notifications) — `WITH CHECK (true)` → `is_staff()`
- ✅ SEC-2: Role escalation hole closed — `user_roles` requires admin
- ✅ W2-2: Server-side AI quota wired into `monika-chat`, `analyze-food`, `scan-receipt` via `increment_ai_quota`
- ✅ Zod validation on AI edge function inputs

### Monetization Framework (Sprint W2)
- ✅ DB tables `subscriptions` + `payment_events` with RLS
- ✅ RPCs: `get_my_active_plan()`, `start_trial()`, `cancel_my_subscription()`
- ✅ Trigger: auto-creates 'free' plan row for every new user
- ✅ Edge fns: `mock-subscribe`, `cancel-subscription`, `expire-subscriptions`
- ✅ `subscription-service.ts` rewritten for server-backed cache + realtime sync
- ✅ `AuthContext` hydrates plan on login
- ✅ UI refactored: UpgradeModal, PlansPage, SubscriptionScreen, UpgradePrompt, RetentionOfferScreen, Profile dev panel
- ✅ **FB-1 closed**: subscription state out of localStorage
- ✅ **FB-2 closed**: AI edge fns read tier from `get_my_active_plan` RPC
- ✅ Secret `DEV_MOCK_PAYMENTS=true` set
- ✅ Smoke test: mock-subscribe → premium/active confirmed in DB

---

## ❌ INCOMPLETE

### Payments
- ❌ Real payment provider (Razorpay/Stripe) — deferred
- ❌ Webhook handler — waits on provider
- ❌ Customer portal / billing history UI — waits on provider

### Sprint 2A — Reliability (~9h)
- ❌ **W2-1** Offline queue for failed writes (IndexedDB + retry worker)
- ✅ **W2-3** Sentry error tracking — DSN hardcoded, initialized in main.tsx, ErrorBoundary reports via Sentry.captureException
- ✅ **SEC-3** pgvector — N/A: extension not installed in this DB. pg_cron + pg_net now installed in `extensions` schema (not `public`)

### Sprint 2B — Retention (~13h)
- ❌ **FB-3** Funnel events (signup, first_log, day_7_retained, first_paid_conversion)
- ❌ **FB-4** Push notifications (FCM + permission flow)
- ❌ Daily reminder push
- ❌ Weekly progress digest email

### Sprint 2C — Compliance (~6h)
- ❌ Privacy/Terms real content (pages are placeholder)
- ❌ GDPR data export endpoint surfaced in UI
- ❌ Account deletion flow UI
- ❌ Transactional email runbook

### Polish
- ❌ Full E2E test: free → trial → premium → cancel → expire → free
- ✅ `expire-subscriptions` scheduled via pg_cron (`expire-subscriptions-nightly`, daily 02:00 UTC, job id 10)
- ❌ Trial countdown UI not wired in some screens

---

## 📈 Overall completion: ~72%

| Area | % |
|---|---|
| Core app features | 95% |
| Security & RLS | 90% |
| Monetization framework | 85% |
| Reliability | 30% |
| Analytics & retention | 15% |
| Legal/compliance | 25% |
| Real payments | 0% |

**Top blockers:** No real payment provider · No error tracking · No offline queue · No funnel analytics

---

## 🎯 Prioritised To-Do

| Priority | Item | Effort |
|---|---|---|
| P0 | Sentry error tracking (W2-3) | S (2h) |
| P0 | SEC-3 move pgvector out of public | S (1h) |
| P0 | Schedule `expire-subscriptions` via pg_cron | S (30m) |
| P1 | Offline queue (W2-1) | L (5h) |
| P1 | Funnel events (FB-3) | M (3h) |
| P1 | Plug in Lovable Stripe | M (3h) |
| P2 | Push notifications (FB-4) | L (4h) |
| P2 | Daily reminder + weekly digest | M (3h) |
| P2 | Privacy/Terms real content | M (2h) |
| P3 | GDPR export + account deletion UI | M (3h) |
| P3 | Customer portal / billing history | M (2h) |

---

## 🔁 Recovery Prompt (paste this when you return)

```
Resume NutriLens AI build. Context: 8F42B1C3-5D9E-4A7B-B2E1-9C3F4D5A6E7B

Read .lovable/plan.md first. Status when I left:
- Monetization framework SHIPPED (mock-subscribe works, FB-1 + FB-2 closed)
- DEV_MOCK_PAYMENTS=true secret set
- Premium tier quota enforcement live in monika-chat / analyze-food / scan-receipt

Execute in this order, do NOT skip steps. Create a task tracker entry for
each numbered item, mark in_progress one at a time, add notes as you
discover things.

PHASE 1 — P0 fixes (~3.5h)
1. Add Sentry error tracking (W2-3): create SENTRY_DSN secret, init in
   main.tsx, wrap ErrorBoundary, send unhandled rejections.
2. Move pgvector extension out of public schema (SEC-3): migration to
   dedicated `extensions` schema, update any callers.
3. Schedule expire-subscriptions via pg_cron to run daily at 02:00 UTC.

PAUSE after Phase 1 and show me a status update before continuing.

PHASE 2 — P1 monetization + retention (~11h)
4. Plug in Lovable Stripe via payments--enable_stripe_payments — replace
   mock-subscribe call sites with real Stripe Checkout, keep mock as dev
   fallback gated by DEV_MOCK_PAYMENTS.
5. Offline queue (W2-1): IndexedDB queue for failed Supabase writes,
   retry worker on reconnect, surface "X items pending sync" UI.
6. Funnel events (FB-3): fire signup / first_log / day_7_retained /
   first_paid_conversion into a new `analytics_events` table.

PHASE 3 — verify & ship (~1h)
7. Full E2E test: new user → trial → premium → cancel → expire → free.
8. Update .lovable/plan.md, ticking completed items.
9. Run supabase--linter, confirm zero high-severity findings.

Begin with Phase 1, item 1 (Sentry).
```
