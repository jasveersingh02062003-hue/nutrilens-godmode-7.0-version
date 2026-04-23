

# 🎯 Eligibility check result — Paddle is the recommended provider

The check classified NutriLens as a digital health & fitness software product, which is a clean fit for **Paddle**. This changes the recommendation from the previous plan.

## Why Paddle (not Stripe) for your app

| Aspect | Paddle (recommended) | Stripe |
|---|---|---|
| Setup | Zero account, works in test mode today | Same |
| Tax/VAT/GST worldwide | ✅ Handled automatically on every sale | ⚠️ Per-transaction choice you have to configure |
| Sales tax filing & remittance | ✅ Paddle does it for you | You file (unless you opt into +3.5% managed) |
| Chargeback / refund handling | ✅ Paddle handles | You handle |
| Pricing | Flat **5% + 50¢** all-in | ~2.9% + 30¢ + tax handling fees on top |
| India-friendly | ✅ Sells globally on your behalf | ✅ But you handle GST yourself |
| Best for | Solo builders, indie SaaS, no compliance team | Larger teams that want fine control |

For a solo Indian indie SaaS selling globally, **Paddle removes the GST + international tax + chargeback headache entirely**. That's a big deal at your stage.

## Pricing maps cleanly to Paddle

- `premium_monthly` → ₹149/mo
- `premium_yearly` → ₹1,499/yr
- `ultra_monthly` → ₹499/mo

Paddle handles INR + foreign currency conversion automatically.

---

## 📋 Updated Phase B checklist (Paddle instead of Stripe)

- [ ] **B1.** Call `payments--enable_paddle_payments` (provisions sandbox account, products, webhook URL)
- [ ] **B2.** Create the 3 products in Paddle sandbox: `premium_monthly` ₹149 / `premium_yearly` ₹1,499 / `ultra_monthly` ₹499
- [ ] **B3.** New `create-checkout` edge fn → returns Paddle Checkout URL for the chosen price
- [ ] **B4.** New `paddle-webhook` edge fn (signature-verified, `verify_jwt=false`) → on `subscription.activated` / `subscription.updated` / `subscription.canceled`, upserts `subscriptions` and writes `payment_events`
- [ ] **B5.** `PaymentMethodSheet.tsx` → branch on `DEV_MOCK_PAYMENTS`: if `true`, keep mock for local dev; if `false`, redirect to Paddle Checkout
- [ ] **B6.** New `customer-portal` edge fn → returns Paddle Customer Portal URL; wire button into `ManageSubscriptionSheet.tsx`
- [ ] **B7.** Smoke test with Paddle's sandbox test card → confirm DB flips to `premium / active` → Manage shows the Paddle-managed sub

## ⏱ Time & cost

- ~2.5 hours of build
- **Zero setup cost** — Paddle sandbox is free, no account creation needed today
- You only verify the Paddle account when you're ready to take live money

## ⚠️ One thing to know

Enabling payments requires a **Pro plan** on this workspace. If you're not on Pro, the enable tool will fail and I'll pause and tell you. Lovable Cloud is already enabled, so that's covered.

---

## ✅ Reply with one of

- **"Go Paddle"** → I run `enable_paddle_payments` and build B1–B7 (~2.5h)
- **"I want Stripe instead"** → Skip the recommendation and use built-in Stripe (you'd handle India GST yourself)
- **"Just enable, products later"** → I only run B1 so you can see the Paddle dashboard before deciding on prices
- **"Hold on, explain Paddle more"** → I'll answer questions before touching anything

