

# 💳 Payment Wiring Without an Account — Best Path Forward

## The situation

You don't have a Razorpay or Stripe account yet. You want to:
1. Build the **subscription framework** now (DB tables, server-side plan check, paywall logic)
2. Plug in the actual payment processor **later** when you create an account
3. Still close the two 🚨 client-side bypass holes (FB-1, FB-2) immediately

**Good news:** This is the *right* order to do it in. The hardest part of monetization isn't the payment SDK — it's the server-side subscription state, webhook handling, and quota enforcement. We can build all of that **today**, mock the checkout step, and swap in Razorpay/Stripe later in ~2 hours when you're ready.

---

## Recommended approach: "Provider-agnostic monetization core"

Build the entire backend as if a payment provider exists. Use a **mock checkout** in dev that flips the user's plan server-side (gated behind a dev flag) so we can test the full free→paid→cancel→expire flow end-to-end without a real account.

When you're ready to plug in a real processor, we add ONE edge function (`razorpay-webhook` or `stripe-webhook`) and one frontend SDK call. Everything else stays.

---

## What gets built now (~10h)

### Phase 1 — Server-side subscription core (~6h)

**1. New DB tables (migration):**
```text
subscriptions
  ├─ user_id (uuid, unique)
  ├─ plan ('free' | 'premium' | 'ultra')
  ├─ status ('active' | 'cancelled' | 'expired' | 'trialing' | 'past_due')
  ├─ current_period_start / current_period_end (timestamptz)
  ├─ trial_end (timestamptz, nullable)
  ├─ provider ('mock' | 'razorpay' | 'stripe', default 'mock')
  ├─ provider_subscription_id (text, nullable)
  ├─ provider_customer_id (text, nullable)
  ├─ cancel_at_period_end (boolean)
  ├─ created_at / updated_at
  └─ RLS: users read own; only service_role writes

payment_events  (audit log)
  ├─ user_id, subscription_id
  ├─ event_type ('subscribe' | 'cancel' | 'renew' | 'payment_failed' | 'expired' | 'trial_started')
  ├─ provider, provider_event_id (for idempotency)
  ├─ amount_inr, raw_payload (jsonb)
  └─ RLS: users read own; only service_role writes
```

**2. Database functions (security definer):**
- `get_my_active_plan()` → returns `{plan, status, trial_end, current_period_end}`. Single source of truth.
- `start_trial()` → atomically creates a `trialing` row if user has never used trial. Replaces `startFreeTrial()` localStorage logic.

**3. Edge functions:**
- `mock-subscribe` (dev-only, gated by `DEV_MOCK_PAYMENTS=true` secret) — flips a user to `premium`/`ultra` instantly. Lets us test paywalls without a real card.
- `cancel-subscription` — sets `cancel_at_period_end = true`. Works for both mock and future real provider.
- `expire-subscriptions` (cron-style, can run via pg_cron later) — flips expired rows to `status='expired'`, plan to `free`.

### Phase 2 — Frontend rewrite (~3h)

**Rewrite `src/lib/subscription-service.ts`:**
- Replace ALL localStorage reads with cached calls to `get_my_active_plan()` RPC
- Cache for 60s in memory (React Query) so we're not hammering the DB on every render
- Listen to a Supabase realtime channel on `subscriptions` so plan changes propagate instantly
- Trial flow: `startFreeTrial()` calls the `start_trial()` RPC instead of writing localStorage
- Daily counters (camera/monika/voice/barcode) **stay in localStorage** — they're already enforced server-side by `ai_usage_quota` for AI calls; non-AI counters are UX hints only

**Update gate functions:**
- `canSendMonicaMessage()`, `canUseCameraScan()`, etc. become `async` and await the cached server plan
- All call sites already `await` the limit check before opening AI flows, so this is a localized change

**Subscription Screen UI:**
- Add a "Start Mock Subscription (Dev)" button visible only when `import.meta.env.DEV`
- Replace the current upgrade buttons with disabled state + "Coming soon — payment integration in progress" tooltip
- Keep the trial CTA fully functional (it works without a payment processor)

### Phase 3 — Closes the bypass (~1h)

- Fix FB-1: plan no longer in localStorage → can't be spoofed
- Fix FB-2: AI tier checks now server-side → spoofed clients get rejected by edge fn
- Edge functions `monika-chat`, `analyze-food`, `scan-receipt` get a 2-line addition: read plan via `get_my_active_plan()`, raise daily cap for premium/ultra

---

## What gets added LATER when you have an account (~2h per provider)

When you create your Razorpay account:
1. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` as secrets
2. New edge fn `create-razorpay-order` — replaces `mock-subscribe`
3. New edge fn `razorpay-webhook` — verifies HMAC, writes to `subscriptions` + `payment_events`
4. Subscription Screen: swap mock button for Razorpay Checkout SDK call

When you create Stripe account: same pattern, different SDK. Database schema does NOT change.

**OR — simpler option:** Use Lovable's **built-in Stripe payments** (`enable_stripe_payments`). It's a one-click integration that scaffolds the subscription table, webhook, and customer portal automatically. You still don't need a Stripe account upfront — Lovable runs everything in test mode until you claim the account. ~6h instead of building Razorpay manually.

---

## My recommendation

**Build the provider-agnostic core today (Phase 1 + 2 + 3, ~10h).** This:
- ✅ Closes the 🚨 client-side bypass holes immediately (FB-1, FB-2)
- ✅ Lets you test the whole freemium flow end-to-end with mock payments
- ✅ Gives you a working subscription system you can demo
- ✅ Adding Razorpay/Stripe later becomes a 2-hour swap, not a rebuild

Then, when you're ready to take real money, you have two options:
- **Easy path:** Use Lovable's built-in Stripe (recommended) — works in India for cards + UPI, no account creation friction
- **India-first path:** Build custom Razorpay (better UPI/netbanking, native INR subscriptions)

You can decide that later. The framework we build today supports both.

---

## Tasks I'll create when we move to default mode

1. Create `subscriptions` + `payment_events` tables + RLS + indexes
2. Create `get_my_active_plan()` and `start_trial()` RPCs
3. Build `mock-subscribe` + `cancel-subscription` + `expire-subscriptions` edge fns
4. Rewrite `subscription-service.ts` to call RPC + React Query cache + realtime sync
5. Update `monika-chat`, `analyze-food`, `scan-receipt` to read plan server-side for tier-based quotas
6. Update Subscription Screen UI (mock button in dev, "coming soon" in prod)
7. End-to-end test: mock subscribe → check premium quota raise → cancel → expire → verify back to free

Estimated total: **~10 hours** to ship a fully working subscription system that just lacks a real payment SDK.

---

## How to proceed

Reply with one of:
- **"Build the framework"** → I'll do all 7 tasks above (~10h). Recommended.
- **"Build framework + use Lovable Stripe later"** → Same as above, plus I'll document the exact 4 lines to flip to Lovable's built-in Stripe when you're ready (~10h + future 30min)
- **"Just close the bypass, skip mock UI"** → Minimal version: build `subscriptions` table + RPC + rewrite `subscription-service.ts`, no mock checkout (~6h)
- **"Wait, do something else first"** → Pivot to Sprint 2A finish (offline queue) or Sprint 2B (push notifications) instead

