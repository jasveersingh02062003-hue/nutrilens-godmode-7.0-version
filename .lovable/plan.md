

# 📊 NutriLens AI — Status Report (Post Custom Sprint)

## Part 1 — What just shipped (verified live)

| Item | Evidence | Status |
|---|---|---|
| **SEC-1** Tighten 9 permissive RLS | New migration `20260423102029_*.sql` replaced `WITH CHECK (true)` policies on `city_prices`, `packed_products`, `price_history`, `ad_creatives`, `price_alert_notifications` with `is_staff()` / `is_brand_member()` guards. Confirmed in live schema dump. | ✅ Done |
| **SEC-2** HIBP leaked-password protection | Toggled ON in Cloud auth config | ✅ Done |
| **W2-2** `/healthz` edge fn | Deployed; returns `{status, db, latency_ms, ts}`; 503 on DB failure; CORS ok | ✅ Done |

Linter went from **11 → 1 warn** (only the low-risk `vector` extension in `public` remains).

---

## Part 2 — Full progress checklist

### ✅ Already done
- Week 1 (13/13): AI quota, Zod (5 fns), prompt sanitizer, age-gating, account-deletion UI, branded 404, safe reload, RPC delete cascade
- Sprint 2A partial: SEC-1 ✅, SEC-2 ✅, W2-2 ✅

### ⬜ Sprint 2A leftovers (~10h)
- **W2-1** Offline meal-log queue (IndexedDB + replay) — 8h
- **W2-3** Sentry email alerts — 30m (dashboard config)
- **SEC-3** Move `vector` extension to `extensions` schema — 30m

### ⬜ Sprint 2B (~13h)
- **W2-4** Wire funnel events at 6 call sites — 4h
- **W2-5** Activation event `logged_3_meals_day_1` — 1h
- **W2-6** OneSignal/FCM backend + `push_tokens` table + edge fn — 8h

### ⬜ Sprint 2C (~6h) — legal/email
- **W2-7** grievance@/support@ DNS+mailbox — 2h
- **W2-8** 7-day refund policy in Terms — 1h
- **W2-9** Cross-border disclosure in Privacy §5 — 30m
- **W2-10** `BREACH_RESPONSE.md` — 2h
- **W2-11** `INCIDENTS.md` — 1h

### ⬜ Front/Back consistency gaps (still open — 4 items)
- **FB-1** Subscription plan in localStorage → needs `subscriptions` table (folded into L-1 Razorpay)
- **FB-2** Paid-tier check client-side → folded into L-1
- **FB-3** Funnel events not fired → covered by W2-4/5
- **FB-4** Push notifications stub-only → covered by W2-6

### ⬜ Pre-public launch (~104h) — see existing `.lovable/plan.md`
- **L-1..L-4** Razorpay + subscriptions + verify-payment + dunning — 20h
- **L-5..L-9** Performance — 21h
- **L-10..L-13** Security hardening (private meal-photos, CSP, CORS, sponsored badges) — 8h
- **L-14..L-18** Ops & store launch — 39h

---

## Part 3 — Updated launch gates

| Gate | Status | Remaining blockers |
|---|---|---|
| 🟢 Closed beta (≤500) | **GO** | None hard. W2-6 (push) recommended for retention. |
| 🚨 Public launch | **NO-GO** | L-1 (payment + server-side plan check) is the single biggest blocker; without it the freemium gate is bypass-able. |

---

## Part 4 — Recommended next sprint

The fastest path to **public-launch-ready** is **Razorpay (L-1→L-4)** because it also fixes FB-1 + FB-2 (the two 🚨 client-side bypass issues). Without it, no closed beta should ever take payment.

Order of execution I recommend:

1. **L-1 Razorpay foundation** (~16h)
   - Create `subscriptions` table (`user_id`, `plan`, `status`, `current_period_end`, `razorpay_subscription_id`, `razorpay_customer_id`)
   - Create `payment_events` audit table
   - Edge fn `create-razorpay-subscription` (server-side plan creation, RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET as secrets)
   - Edge fn `razorpay-webhook` (verify HMAC signature, write to `subscriptions` + `payment_events`)
   - Edge fn `cancel-subscription` (one-click, no dark patterns)
   - Rewrite `subscription-service.ts` to call new RPC `get_my_active_plan()` (security definer, reads from `subscriptions`)
   - Update `canSendMonicaMessage`, `canUseCameraScan`, etc. to await server check
   - Subscription screen UI updates (Razorpay Checkout SDK)

2. **L-2/L-3** server-side plan check + cancellation flow (folded into L-1)

3. **L-4 Dunning emails** (~4h) — 3 emails: `payment_failed`, `payment_retry_3_days`, `subscription_cancelled` via Resend (already a Lovable connector)

4. Then either **W2-6 push** (retention) or jump to **L-5 perf**.

---

## Part 5 — Tasks I'll create when we switch to default mode

1. Create `subscriptions` + `payment_events` tables with RLS
2. Add Razorpay secrets (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) via add_secret
3. Build `create-razorpay-subscription` edge fn
4. Build `razorpay-webhook` edge fn (signature-verified)
5. Build `cancel-subscription` edge fn
6. Rewrite `subscription-service.ts` to use server-side `get_my_active_plan()` RPC
7. Update Subscription Screen with Razorpay Checkout
8. Build dunning email flow via Resend
9. End-to-end test: subscribe → cancel → expire → verify quota change

Estimated total: **~20 hours** to close the monetization + bypass gap and unlock public-launch path.

---

## Part 6 — How to proceed

Reply with one of:
- **"Razorpay"** → I'll implement L-1 → L-4 (recommended; also fixes FB-1 + FB-2)
- **"Sprint 2A finish"** → W2-1 offline queue + W2-3 Sentry + SEC-3 (~9h)
- **"Sprint 2B"** → W2-4/5/6 funnel + push (~13h, retention)
- **"Sprint 2C"** → legal/email runbooks (~6h, low-risk paperwork)
- **"Custom: <codes>"** → e.g. `"Custom: W2-3, SEC-3, W2-8"` for quick wins (~2h)

My recommendation: **"Razorpay"** — it's the only thing standing between you and a paid public launch, and it closes the two highest-severity bypass issues in the same sprint.

