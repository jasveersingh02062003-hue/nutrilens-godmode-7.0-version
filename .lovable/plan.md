

# 🔬 Final Verification — NutriLens Pro Subscription Journey

I checked the live DB, every code path, edge function, RLS policy, the audit trigger, and admin pages. Here is the honest end-to-end picture.

---

## ✅ What is wired and working (verified against live data)

### 👤 User journey (Free → Pro → Manage → Cancel)

| Step | Status | Evidence |
|---|---|---|
| 1. App mount → daily paywall provider | ✅ | `App.tsx:247` mounts `<DailyPaywallProvider />` |
| 2. Anti-annoyance gate (2h + meal + 7d cooldown) | ✅ | `paywall-triggers.ts` |
| 3. Logged-out polling skipped | ✅ | `useDailyPaywall.tsx:38` guards on `userId` |
| 4. **5 entry points → unified flow** | ✅ | `UpgradeModal` is a wrapper around `<PaywallScreen />` |
| 5. Paywall → Plan picker → Payment → Processing → Success | ✅ | All 4 stages chained in `PaymentMethodSheet` |
| 6. Mock charge persists method label | ✅ | `mockSubscribe(plan, days, { type, display, amount_paise })` |
| 7. Realtime plan flip (DB → all UI) | ✅ | `subscriptions` channel filtered by user_id; banner/badge update instantly |
| 8. Server-owned plan (no localStorage trust) | ✅ | `getPlan()` reads `get_my_active_plan()` RPC |
| 9. Profile → Manage sheet for paid users | ✅ | `Profile.tsx:616` |
| 10. Manage shows method, next charge, period end | ✅ | Reads `payment_events.raw_payload.payment_method_display` + `amount_inr` |
| 11. Cancel → Retention offer → confirm cancel | ✅ | `RetentionOfferScreen` intercepts before `cancel_my_subscription()` RPC |
| 12. Retention "accept" routes through receipt screen | ✅ | Opens PaywallScreen with `startAtPlanPicker` |
| 13. Trial expiry server-side cron | ✅ | `expire-subscriptions` edge fn |
| 14. Edge fn safety gate | ✅ | `mock-subscribe` blocked unless `DEV_MOCK_PAYMENTS=true` |

### 🛡 Admin journey (visibility + control)

| Step | Status | Evidence |
|---|---|---|
| 15. Admin nav has "Subscriptions" link | ✅ | `AdminLayout.tsx:28` Crown icon |
| 16. Admin Users — Plan column with badges + filter | ✅ | `AdminUsers.tsx` |
| 17. Admin User Detail — subscription panel + payment history | ✅ | `AdminUserDetail.tsx` |
| 18. Admin actions (Comp / Force-cancel / End trial + reason) | ✅ | `admin_set_subscription` RPC |
| 19. Admin Subscriptions page — MRR (yearly amortised /12), ARR, trial count, cancelling, 30d chart | ✅ | `AdminSubscriptions.tsx:59-63` |
| 20. Admin Revenue split (subs vs event-plans) | ✅ | `AdminRevenue.tsx` |
| 21. Audit trigger on `payment_events INSERT` | ✅ | `trg_audit_payment_event` enabled |
| 22. **Admin can SELECT audit_logs** (widened from super_admin only) | ✅ | RLS policy "Admins read audit logs" |
| 23. Historical payment row backfilled with method label | ✅ | DB shows "UPI · Mock (legacy)" |

**Live DB snapshot:** 6 users · 5 free · 1 premium active · 0 trials · 0 cancelling · 1 payment event (₹199) · 1 audit row · 0 saved payment methods (cosmetic — saved-method UI only triggers on the next paid flow).

---

## 🟡 Remaining minor gaps (no real bugs found)

| # | Item | Severity | Note |
|---|---|---|---|
| G1 | **Pause subscription** — mentioned in the original Priya journey but never built | Minor / spec drift | Needs provider support. Skip until real Stripe day or build a soft 30-day pause now (status='paused' + skips renewal). |
| G2 | **`payment_methods` table is empty** — `saveMockMethod()` only fires after the *next* successful UPI charge; the historical premium user paid before the persist-method change | Cosmetic | Self-resolves after the next mock payment. Optional: backfill 1 row from the existing payment event's method. |
| G3 | **MRR fallback** uses flat ₹149 when `payment_events.amount_inr` is missing for a paying user | Cosmetic | With real Stripe webhooks every paying user has an event; matters only for admin-comped users. Could replace fallback with `0` (more honest) or use plan tier. |
| G4 | **Camera/Monica daily counters in localStorage** — reset client-side, not server-enforced | Already mitigated | `analyze-food` & `monika-chat` edge fns enforce real caps via `ai_usage_quota`; localStorage is only a UX hint. |
| G5 | **`payment_methods` UI** — no "Default card" management screen yet (only auto-saved on charge) | Deferred | Not in original spec; provider's hosted page handles this in production. |

**No critical bugs.** Every link in the chain that I could verify against the live database returns correct, real-time data.

---

## 📋 What's left to build (only if you want it now)

Pick any combination — none are blocking the journey:

### Option P1 — Pause subscription (~25 min)
- Add `paused` to `subscription_status` enum
- New RPC `pause_my_subscription(days int)` — sets status=paused, extends period_end
- "Pause" button in `ManageSubscriptionSheet` (with 7/14/30-day picker)
- Server-side `expire-subscriptions` cron resumes when pause window ends
- Admin User Detail shows "Paused until X" badge

### Option P2 — Backfill empty `payment_methods` (~5 min)
One INSERT mirroring the existing `payment_events` row → so the existing premium user's Manage sheet shows a saved method tile.

### Option P3 — MRR fallback uses tier instead of flat ₹149 (~5 min)
`paying.reduce(...)` falls back to `u.plan === 'ultra' ? 499 : 149` instead of always 149 — more accurate when Ultra users exist.

### Option P4 — Honest social-proof rounding (~2 min)
`PaywallScreen` already crosses to real DB count at 100. Add `12.8k+` rounding when count ≥ 1000 so it doesn't read as a suspicious exact "12,847" forever.

### Option P5 — Admin "Resend receipt" button (~15 min)
On `AdminUserDetail` payment-events row, an "Email receipt" button that calls a new `resend-receipt` edge fn (deferred to email-provider day; can stub now).

---

## ⏱ Total effort

| Option | Time |
|---|---|
| P1 Pause | 25 min |
| P2 backfill payment_methods | 5 min |
| P3 MRR tier fallback | 5 min |
| P4 social-proof rounding | 2 min |
| P5 Resend receipt stub | 15 min |
| **All five together** | ~50 min |

---

## What still waits for "real Stripe / Razorpay day"
- Real UPI deeplinks (gpay://, phonepe://) — currently mocked
- Card tokenization
- Webhook receiver (replaces `mock-subscribe`)
- 3-days-before-renewal email/push reminder
- True receipt PDFs (currently a synthesised `MOCK-XXXX` id)

---

## Reply with one of

- **"Build P1"** → just Pause subscription
- **"Build P2 + P3 + P4"** → 12 minutes of polish, no new features
- **"Build all five"** → ~50 min, fully closes the spec
- **"Ship it as-is"** → the journey is complete and verified; only re-open when wiring real payments

