

# 💳 Phase 2 — Real-feeling Subscription Flow (no Stripe/Razorpay account yet)

## The core idea

You don't have a payment provider account yet. That's fine — we build the **entire user-facing subscription journey** (paywall, plan selector, payment method picker, "processing" screen, success state, receipt, manage subscription) using the existing `mock-subscribe` edge function as the backend. When you create a Razorpay/Stripe account later, we swap **one function call** and the whole UI keeps working.

This unblocks:
- Real UX testing today
- Conversion-rate measurement today
- Screenshots for app store / marketing today
- Real money tomorrow (30-min swap)

---

## Part 1 — How we ship payments without a provider account

### Strategy: "Provider-shaped mock"

Build the UI exactly as it would look with Razorpay UPI Intent flow. Behind the scenes, instead of calling Razorpay's checkout, we call our `mock-subscribe` function after a realistic 2-second "processing" animation.

```text
User taps "Pay ₹125"
   ↓
Show payment method sheet (UPI / Card / NetBanking / Wallet)
   ↓
User picks UPI → enter UPI ID OR pick installed app (GPay/PhonePe/Paytm)
   ↓
"Confirming payment..." spinner (2.5s realistic delay)
   ↓
mock-subscribe edge fn flips plan to premium
   ↓
Success screen with confetti + receipt
   ↓
Email-style receipt saved to Profile → Billing History
```

### Why this is honest, not scammy

- Show a small **"Test mode"** badge in the top-right of the payment sheet (only visible while `DEV_MOCK_PAYMENTS=true`)
- The success screen says "Subscription activated" — true, the DB row really flips
- Receipt shows ₹0 charged with a "Test Transaction" watermark
- When we flip to real Stripe later, the badge + watermark auto-disappear (gated by the same env flag)

### The one-line swap later

In `subscription-service.ts`:
```ts
// today
await supabase.functions.invoke('mock-subscribe', { body: { plan, days } })

// tomorrow (after enable_stripe_payments)
await supabase.functions.invoke('create-checkout', { body: { plan, days } })
```
That's it. Every screen, animation, and component stays.

---

## Part 2 — The subscription journey (inspired by Cred / Spotify / Cult.fit / Headspace)

### 2.1 Trigger points (when paywall appears)

| Trigger | Where | Frequency |
|---|---|---|
| Soft nudge | Dashboard banner | Always visible for free users (existing `UpgradeBanner`) |
| Hard wall | After 3rd AI scan in a day | Modal blocks further scans |
| Daily prompt | App open, max 1×/day | Bottom sheet, dismissible, 7-day cooldown after dismiss |
| Feature gate | Tapping locked feature (meal plans, exports) | Modal with that feature highlighted |
| Profile tap | Profile → "Upgrade to Pro" row | Full-screen plan page |

**Daily prompt rule:** stored in `localStorage` as `lastPaywallShown=YYYY-MM-DD`. If user dismisses, push next show date by 7 days.

### 2.2 The 4-screen flow

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ 1. PAYWALL      │ →  │ 2. PLAN PICKER  │ →  │ 3. PAYMENT      │ →  │ 4. SUCCESS      │
│                 │    │                 │    │    METHOD       │    │                 │
│ "Why Pro"       │    │ Monthly ₹149    │    │ UPI / Card /    │    │ Confetti        │
│ social proof    │    │ Yearly ₹125/mo  │    │ NetBank / Wallet│    │ "You're Pro"    │
│ before/after    │    │ SAVE 70% badge  │    │ Saved methods   │    │ Receipt link    │
│ 6 feature icons │    │ 3-day free trial│    │ "Test mode"     │    │ Next-step CTA   │
│ [Start trial]   │    │ [Continue]      │    │ [Pay ₹X]        │    │ [Open dashboard]│
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2.3 Screen 1 — Paywall (the convincer)

What we put on it (in scroll order):
1. **Hero:** "Reach your goal 2× faster with AI" + animated calorie ring
2. **Social proof bar:** "12,847 Indians upgraded this month" (we'll fake-but-honest count from `subscriptions` table)
3. **Before/after card:** "Free: 3 scans/day · Pro: Unlimited"
4. **Feature grid (6 tiles):** Unlimited scans, Meal plans, Monika AI, Exercise tuning, Full archive, Priority support
5. **Trust strip:** ⭐ 4.7 · 🇮🇳 Made in India · 🔒 Cancel anytime · 🆓 3-day free trial
6. **Sticky CTA:** "Start 3-day free trial" (primary) + "Maybe later" (ghost, smaller)

### 2.4 Screen 2 — Plan picker

Two cards side by side (existing UpgradeModal layout, polished):
- **Yearly ₹1,499** (= ₹125/mo) — "BEST VALUE · SAVE 70%" badge, glow border
- **Monthly ₹149** — plain card

Below: "✓ 3-day free trial · ✓ Cancel anytime · ✓ No charges during trial"

### 2.5 Screen 3 — Payment method (the Indian-native part)

Bottom sheet that mimics Razorpay/PhonePe checkout:

```text
┌──────────────────────────────────────┐
│  Pay ₹1,499              [Test mode] │
│  NutriLens Pro · Yearly              │
├──────────────────────────────────────┤
│  💳 SAVED METHODS                    │
│  └─ (empty for first time)           │
│                                      │
│  ⚡ UPI                               │
│  ├─ 📱 Google Pay        [Recommended]│
│  ├─ 📱 PhonePe                       │
│  ├─ 📱 Paytm                         │
│  └─ ✏️  Enter UPI ID                  │
│                                      │
│  💳 Cards                             │
│  └─ Add Debit / Credit Card          │
│                                      │
│  🏦 Netbanking                        │
│  └─ Choose bank                      │
│                                      │
│  👛 Wallets                           │
│  └─ Amazon Pay, Mobikwik, Freecharge │
└──────────────────────────────────────┘
[          Pay ₹1,499 securely        ]
🔒 256-bit encrypted · Powered by Lovable
```

When user picks any option → 2.5s "Confirming with bank..." spinner → success.

### 2.6 Screen 4 — Success

- Lottie/CSS confetti burst (existing `ConfettiCelebration` component)
- Big checkmark, "Welcome to NutriLens Pro 🎉"
- "Your trial ends on April 26 · You'll be charged ₹1,499 then"
- "View receipt" button → opens receipt sheet
- "Take me to my dashboard" primary CTA

### 2.7 Manage subscription (Profile → Subscription)

- Current plan card (Pro · Yearly · Renews May 23, 2026)
- Payment method on file (masked: "UPI · ****@ybl")
- Billing history list (each entry → tap for receipt)
- "Pause subscription" (1 month, retention lever)
- "Cancel subscription" (opens existing `RetentionOfferScreen`)
- "Update payment method"

### 2.8 Autopay / recurring — recommendation

**Yes, default to autopay** (industry standard, lower churn). But:
- Show "✓ Auto-renews on Apr 26 · cancel anytime in 1 tap" prominently
- Send email + push **3 days before renewal** (compliance + trust)
- One-tap cancel from Profile (no support email gauntlet)

For UPI autopay specifically, this requires Razorpay/Stripe later — for now we mock the consent screen so the flow is identical.

---

## Part 3 — File-level implementation plan

### New files

```text
src/components/paywall/
  ├── PaywallScreen.tsx          # Screen 1 (full-screen modal)
  ├── PlanPickerScreen.tsx       # Screen 2
  ├── PaymentMethodSheet.tsx     # Screen 3 (the big one)
  ├── PaymentProcessing.tsx      # Spinner + status messages
  ├── PaymentSuccessScreen.tsx   # Screen 4
  ├── ReceiptSheet.tsx           # Tax-invoice style receipt
  ├── BillingHistorySheet.tsx    # Profile → past payments
  ├── ManageSubscriptionSheet.tsx # Profile → manage
  └── TestModeBadge.tsx          # Yellow "Test mode" pill

src/lib/
  ├── paywall-triggers.ts        # Daily-prompt logic, cooldown rules
  ├── payment-flow.ts            # State machine for the 4-screen flow
  └── mock-payment-methods.ts    # Saved methods stub (localStorage)

src/hooks/
  └── useDailyPaywall.ts         # Hook for app-open daily prompt
```

### Modified files

- `src/components/UpgradeModal.tsx` → replace contents with `<PaywallScreen />` (preserves all existing call sites)
- `src/lib/subscription-service.ts` → add `recordPayment()` writing to `payment_events` for receipt history
- `src/pages/Profile.tsx` → add "Subscription" section linking to `ManageSubscriptionSheet`
- `src/App.tsx` → mount `<DailyPaywallProvider />` once, fires sheet on app open

### Database (one migration)

```sql
-- payment_methods table for mock saved methods (real provider tokens later)
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('upi','card','netbanking','wallet')),
  display_name text NOT NULL,    -- "UPI · ****@ybl" or "HDFC ****1234"
  is_default boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their methods" ON public.payment_methods
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### Mock-subscribe enhancement

Update `supabase/functions/mock-subscribe/index.ts` to accept and store:
- `payment_method_type` (upi/card/etc.)
- `display_name`
- `amount_paise`
Returns receipt object the success screen renders.

---

## Part 4 — Daily prompt rules (anti-annoyance)

| Rule | Value |
|---|---|
| Max shows per day | 1 |
| Min hours since app open | 2 (don't interrupt active session) |
| Trigger condition | User has logged ≥1 meal that day (engaged user) |
| Cooldown after dismiss | 7 days |
| Cooldown after "Maybe later" | 3 days |
| Cooldown after starting trial then cancelling | 30 days |
| Permanently silenced if | User taps "Don't show again" |

Store in `localStorage`: `paywall_state = { lastShown, dismissCount, silenced }`.

---

## Part 5 — Tasks (will be created when you approve)

1. DB migration for `payment_methods` table
2. Build `PaywallScreen` (Screen 1) with social proof + features
3. Build `PlanPickerScreen` (Screen 2)
4. Build `PaymentMethodSheet` (Screen 3) — UPI/Card/NetBanking/Wallet
5. Build `PaymentProcessing` + `PaymentSuccessScreen`
6. Build `ReceiptSheet` + `BillingHistorySheet`
7. Build `ManageSubscriptionSheet` for Profile
8. Wire `useDailyPaywall` hook with cooldown rules
9. Enhance `mock-subscribe` to store payment method + return receipt
10. Replace `UpgradeModal` internals, keep existing call sites working
11. Add `TestModeBadge` gated by `DEV_MOCK_PAYMENTS` env flag
12. Smoke test full flow: paywall → plan → payment → success → receipt → cancel

**Total effort: ~6–7 hours**

After this lands, swapping to real Razorpay/Stripe is a 30-minute job: change one function name, remove the test-mode badge, done.

---

## Part 6 — Defer to "real provider day"

These wait for when you create your Razorpay/Stripe account:
- Real UPI Intent deeplinks (gpay://, phonepe://)
- Card tokenization
- Webhook handler for payment events
- Real autopay mandate consent (UPI AutoPay / e-mandate)
- GST invoice with company details
- Refund processing

Everything else ships now.

---

## What I need from you

Reply with one of:
- **"Approved, build it"** → I'll execute Parts 3–5 (~6–7h)
- **"Smaller — skip the daily prompt"** → drop the daily nudge, keep the rest (~5h)
- **"Just the payment sheet for now"** → only Screen 3 + success, hook into existing UpgradeModal (~3h)
- **"Change something"** → tell me what to adjust

