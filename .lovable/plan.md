

# 📊 NutriLens AI — Honest Status Report (verified against live code & DB)

I went through your `.lovable/plan.md` checklist line by line and verified it against the actual code, database, cron jobs, and edge functions. Here is what's really shipped vs what's still missing.

---

## ✅ Already DONE (your plan doc is out-of-date — these are live)

### Phase 1 (P0) — fully shipped
| Item | Reality |
|---|---|
| Sentry error tracking (W2-3) | ✅ `src/lib/sentry.ts` initialised in `main.tsx` with PII scrubbing + global `unhandledrejection` and `window.onerror` listeners |
| Move pg_net out of public schema (SEC-3) | ✅ Verified in DB: `pg_net` now lives in `extensions` schema |
| `expire-subscriptions` cron | ✅ Two cron jobs both active at `02:00 UTC` (`expire-subscriptions-daily` + `expire-subscriptions-nightly` — duplicate, see Bug 1 below) |

### Compliance / Legal — fully shipped
| Item | Reality |
|---|---|
| Privacy policy / Terms real content | ✅ Both pages have proper DPDP Act 2023 content (139 + 137 lines) |
| GDPR data export endpoint | ✅ `export-user-data` edge fn + UI button in `Profile.tsx:107` (rate-limited 3/hr) |
| Account deletion flow | ✅ `delete_my_account()` RPC + "type DELETE to confirm" UI in `Profile.tsx:77` |

### Monetization — fully shipped (mock layer)
- Server-owned plan, realtime sync, paywall, retention, manage sheet, pause/resume, admin Subscriptions page, MRR/ARR, audit trail — all verified earlier.

---

## 🔴 Real gaps still open

| ID | Item | Status | Why it matters |
|---|---|---|---|
| **G1** | **Funnel analytics never fires** | `src/lib/events.ts` exists but `logEvent()` is called **0 times** in the codebase | You can't measure activation/retention. Spec says fire `signup`, `first_meal_logged`, `plan_started`, `subscription_started`, `app_opened` — none are wired |
| **G2** | **Real payment provider** | Mock-only | Can't take real money. Lovable Stripe (`enable_stripe_payments`) plugs in without a Stripe account in test mode |
| **G3** | **Offline write queue (W2-1)** | Not started — only an `OfflineBanner` UI exists | Data loss on flaky mobile networks: failed `daily_logs` writes vanish |
| **G4** | **Push notifications (FB-4)** | Only in-app `Notification.requestPermission()` exists — no FCM, no service worker, no push token registration | Daily reminder + weekly digest both blocked on this |
| **G5** | **Duplicate cron job** | Both `expire-subscriptions-daily` and `expire-subscriptions-nightly` run at `02:00 UTC` | Will fire twice nightly — wasteful, may double-log payment_events |
| **G6** | **Trial countdown UI not surfaced on dashboard** | `getTrialDaysRemaining()` exists but no banner consumes it on Dashboard | Trial users don't see urgency → lower conversion |
| **G7** | **Customer portal / billing history** | `BillingHistorySheet` exists but only shows mock events | Becomes meaningful once G2 is done |

---

## 📋 Implementation Plan — prioritised, atomic, with checklist

### 🟥 PHASE A — High value, low effort (~2 hours)
*Quick wins that tighten what you already shipped.*

- [ ] **A1. Drop the duplicate cron** — keep `expire-subscriptions-daily`, drop `expire-subscriptions-nightly` (1 SQL migration, ~3 min)
- [ ] **A2. Wire funnel events (G1)** — fire `logEvent()` from 5 places:
  1. `AuthContext` → `signup` on first session
  2. `AuthContext` → `app_opened` on every session restore
  3. First successful meal save (`AddFoodSheet` / `LogFood`) → `first_meal_logged` (gated by a profile flag so it fires only once)
  4. `event-plan-service` start → `plan_started`
  5. `subscription-service.applyServerRow` when status flips to `active` & plan ≠ `free` → `subscription_started`
  Effort: ~45 min
- [ ] **A3. Trial countdown banner (G6)** — small banner in `DashboardHeader` shown when `isTrialActive()` is true: *"3 days left in your Pro trial — keep going"* with a CTA that opens `<PaywallScreen />`. ~20 min
- [ ] **A4. Admin funnel widget** — add a simple "Last 30 days" funnel card to `AdminOverview` reading from `events` (signup → first_meal → subscription_started). ~30 min

---

### 🟧 PHASE B — Real payments (~2.5 hours)
*Unblocks revenue. Lovable Stripe works in test mode without you needing a Stripe account.*

- [ ] **B1. Enable Lovable Stripe** via `payments--enable_stripe_payments` (auto-provisions test products, keys, webhook)
- [ ] **B2. Add `create-checkout` edge fn** that creates a Stripe Checkout Session for `premium_monthly` (₹149) / `premium_yearly` (₹1,499) / `ultra_monthly` (₹499)
- [ ] **B3. Add `stripe-webhook` edge fn** with `verify_jwt = false` that handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → upserts `subscriptions` + writes `payment_events`
- [ ] **B4. Replace `mockSubscribe()` call sites** in `PaymentMethodSheet`: when not `DEV_MOCK_PAYMENTS`, redirect to Stripe Checkout. Mock stays as dev fallback so local testing keeps working.
- [ ] **B5. Customer portal link** in `ManageSubscriptionSheet` → `customer-portal` edge fn that returns a Stripe Billing Portal URL (handles real cancellations + payment-method updates)

---

### 🟨 PHASE C — Reliability (~5 hours, can defer)
*Mobile-network resilience. Important before public launch but not blocking revenue.*

- [ ] **C1. IndexedDB outbox** — small wrapper around `daily_logs` upsert, `weight_logs`, `water_logs`, `supplement_logs` writes. On failure, push to outbox.
- [ ] **C2. Retry worker** — on `online` event + every 30s when online, drain the outbox in order with exponential back-off.
- [ ] **C3. Pending-sync UI** — small chip in `DashboardHeader` showing "X items syncing" while outbox > 0; turns green when drained.
- [ ] **C4. Dev test** — toggle DevTools offline → log meal → reload → toggle online → confirm meal appears.

---

### 🟦 PHASE D — Push / Email (~6 hours, defer until first 100 users)
*Retention infrastructure. Heavy lift; only ROI-positive after you have users.*

- [ ] **D1. Web Push setup** — VAPID keys, register service worker, store push subscription per user
- [ ] **D2. Daily reminder edge fn** — pg_cron at user's local meal time (best-effort UTC bucketing)
- [ ] **D3. Email infra** — call `email_domain--setup_email_infra`, then scaffold `weekly-digest` transactional template
- [ ] **D4. Notification preferences UI** — toggles in `NotificationSettingsPanel` for daily / weekly / promotional

---

## 🎯 Recommended order

```text
Today      → Phase A (quick wins, 2h)
Tomorrow   → Phase B (real Stripe, 2.5h)
This week  → Phase C (offline queue, 5h)  
Next week  → Phase D (push + email, 6h)
```

---

## 📦 What I'll change per phase (file-level)

**Phase A**
- new SQL migration → drop duplicate cron
- edit `src/contexts/AuthContext.tsx` → fire `signup` / `app_opened`
- edit `src/lib/subscription-service.ts` → fire `subscription_started`
- edit `src/components/AddFoodSheet.tsx` (or first-meal entry point) → fire `first_meal_logged` once
- edit `src/lib/event-plan-service.ts` → fire `plan_started`
- edit `src/components/dashboard/DashboardHeader.tsx` → trial countdown banner
- edit `src/pages/admin/AdminOverview.tsx` → funnel card

**Phase B**
- call `payments--enable_stripe_payments` tool
- new `supabase/functions/create-checkout/index.ts`
- new `supabase/functions/stripe-webhook/index.ts` (with `verify_jwt=false` block in `config.toml`)
- new `supabase/functions/customer-portal/index.ts`
- edit `src/components/paywall/PaymentMethodSheet.tsx` → branch on `DEV_MOCK_PAYMENTS`
- edit `src/components/paywall/ManageSubscriptionSheet.tsx` → portal button

**Phase C**
- new `src/lib/outbox.ts` (IndexedDB wrapper)
- new `src/lib/sync-worker.ts`
- edit `src/lib/cloud-sync.ts` to push failures into outbox
- edit `src/components/dashboard/DashboardHeader.tsx` → pending-sync chip

**Phase D**
- separate roadmap once Phase A–C ship

---

## ✅ Reply with one of

- **"Build Phase A"** — I'll do the 4 quick wins now (~2h, biggest ROI)
- **"Build Phase A + B"** — wins + real Stripe (~4.5h)
- **"Build all four"** — full sprint (~15h, save for a long session)
- **"Just A1 + A2"** — drop dup cron + funnel events only (~50 min)

