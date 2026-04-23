

# 🎯 Next Step — You don't have Stripe yet. Here's what to do.

## Short answer

**You don't need a Stripe account.** Lovable has a **built-in Stripe payments** integration (`enable_stripe_payments`) that works in **test mode immediately** without you signing up for anything. You can build, test, and even demo the full real-money flow today. You only claim/verify the Stripe account later — when you're ready to take live payments.

So Phase B is **not blocked**. You can still ship it.

---

## Two realistic paths — pick one

### 🟢 Path 1 (recommended) — Build Phase B with Lovable's built-in Stripe (test mode)
*~2.5 hours · zero account setup · works today*

What you get immediately:
- Real Stripe Checkout page (test cards like `4242 4242 4242 4242`)
- Real webhook → real `subscriptions` row flip → real-time UI update
- Customer portal (cancel, update card)
- Mock flow stays as dev fallback (`DEV_MOCK_PAYMENTS=true`)

What's deferred until you're ready for real money:
- Claiming the Stripe account (one click, later)
- Switching test → live (one toggle, later)
- Tax/compliance choice (decide on activation day)

**Checklist:**
- [ ] **B0.** Run `payments--recommend_payment_provider` (eligibility check — required before enabling)
- [ ] **B1.** Call `payments--enable_stripe_payments` (provisions test products, keys, webhook URL)
- [ ] **B2.** Create products: `premium_monthly` ₹149, `premium_yearly` ₹1,499, `ultra_monthly` ₹499
- [ ] **B3.** New `create-checkout` edge fn → returns Stripe Checkout URL
- [ ] **B4.** New `stripe-webhook` edge fn (`verify_jwt=false`) → upserts `subscriptions` + writes `payment_events` on `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted`
- [ ] **B5.** `PaymentMethodSheet`: branch on `DEV_MOCK_PAYMENTS` — if false, redirect to Stripe Checkout; if true, keep mock for local
- [ ] **B6.** New `customer-portal` edge fn → returns Billing Portal URL; wire button in `ManageSubscriptionSheet`
- [ ] **B7.** Smoke test: pay with `4242 4242 4242 4242` → confirm DB flips → Manage shows Stripe-managed sub

---

### 🟡 Path 2 — Skip payments for now, harden the rest
*~5 hours · revenue stays mocked, but everything else gets production-ready*

Pick this if you want to launch a free beta first and add payments later.

**Checklist:**
- [ ] **C1.** IndexedDB outbox for failed `daily_logs` / `weight_logs` / `water_logs` / `supplement_logs` writes
- [ ] **C2.** Retry worker (drains on `online` event + every 30s)
- [ ] **C3.** "X items syncing" chip in `DashboardHeader`
- [ ] **C4.** Manual offline test (DevTools → offline → log meal → online → verify)
- [ ] **C5.** Run `supabase--linter` and resolve any new findings

When you're ready for revenue, run Path 1 on top — they don't conflict.

---

## What I do NOT recommend

- ❌ **BYOK Stripe** (`enable_stripe`) — requires you to create a Stripe account + paste a secret key. Pointless when `enable_stripe_payments` does the same thing without an account.
- ❌ **Razorpay** — no built-in Lovable integration; you'd need a Razorpay account + manual webhook wiring. Higher effort, no benefit over Stripe today.
- ❌ **Staying mock-only forever** — fine for now, but you can never actually take ₹1.

---

## Prerequisites I'll verify before starting Path 1

| Check | Required for | If missing |
|---|---|---|
| Lovable Cloud enabled | Both paths | Already enabled ✅ |
| **Pro plan or higher** on this workspace | Path 1 only | I'll pause and tell you to upgrade — payments require Pro |
| `DEV_MOCK_PAYMENTS=true` secret | Both paths (kept as dev fallback) | Already set ✅ |

---

## 📦 File-level changes for Path 1

- new `supabase/functions/create-checkout/index.ts`
- new `supabase/functions/stripe-webhook/index.ts` (+ `[functions.stripe-webhook] verify_jwt = false` block in `supabase/config.toml`)
- new `supabase/functions/customer-portal/index.ts`
- edit `src/components/paywall/PaymentMethodSheet.tsx` → branch on env
- edit `src/components/paywall/ManageSubscriptionSheet.tsx` → portal button
- edit `src/lib/subscription-service.ts` → `startCheckout(plan, interval)` helper that invokes `create-checkout`

---

## ⏱ Effort comparison

| Path | Time | Outcome |
|---|---|---|
| **Path 1** Built-in Stripe (test mode) | 2.5 h | Real checkout works today; flip to live later in 1 click |
| **Path 2** Offline queue only | 5 h | Mobile-resilient; revenue still mocked |
| **Both** | 7.5 h | Production-ready end-to-end |

---

## ✅ Reply with one of

- **"Go Path 1"** → I run the eligibility check + enable built-in Stripe + build B1–B7
- **"Go Path 2"** → I build the offline queue, leave payments mocked
- **"Both"** → Path 1 first, Path 2 right after
- **"Just check eligibility"** → I only run `recommend_payment_provider` so you can see what category your app falls into before deciding

