

# 🔬 Deep Verification — NutriLens Pro Subscription Journey

I checked every link in the chain: UI components, Profile wiring, App mount, subscription-service, mock-subscribe edge fn, admin pages, and live database state. Here's the honest picture.

---

## 🟢 What's Working (verified end-to-end)

| Layer | Item | Evidence |
|---|---|---|
| **App mount** | `<DailyPaywallProvider />` mounted in `App.tsx` line 245 | ✅ Daily prompt will fire |
| **Auth → cache** | `initSubscriptionService(user.id)` called from `AuthContext.tsx:38` on every auth state change | ✅ Plan cache hydrates per user |
| **Realtime sync** | `subscription-service.ts` opens a Supabase realtime channel on `subscriptions` table filtered by user_id | ✅ Plan flips reflect instantly in UI |
| **Server-owned plan** | `getPlan()` reads from `subscriptions` table via `get_my_active_plan()` RPC, never trusts localStorage | ✅ Source of truth correct |
| **UpgradeModal swap** | `UpgradeModal.tsx` is now a 14-line wrapper around `<PaywallScreen />` — all 9 call sites flow through new journey | ✅ |
| **Profile → Manage** | Free → opens Paywall, Premium/Ultra → opens `ManageSubscriptionSheet` (Profile.tsx:196, line 616) | ✅ |
| **4-screen flow** | Paywall → PlanPicker → PaymentMethodSheet → PaymentProcessing → PaymentSuccessScreen all chained | ✅ |
| **Mock backend** | `mock-subscribe` edge fn upserts `subscriptions`, writes `payment_events` with receipt + method | ✅ Verified DB has 1 premium row + 1 subscribe event |
| **Cancel** | `cancelSubscription()` → `cancel-subscription` edge fn → sets `cancel_at_period_end=true` | ✅ |
| **Trial expiry** | Server-side `expire-subscriptions` edge fn (Phase 1 cron) | ✅ |
| **Anti-annoyance** | 2h session gate + 7d/3d/30d cooldowns in `paywall-triggers.ts` | ✅ |
| **Test mode badge** | `TestModeBadge` rendered in `PaymentMethodSheet` header | ✅ |
| **DB tables** | `subscriptions`, `payment_events`, `payment_methods`, `audit_logs` all exist | ✅ |

**Live DB snapshot:** 5 free users, 1 premium user, 1 mock `subscribe` event from 2026-04-23. The pipeline IS writing real rows.

---

## 🔴 Critical Gaps (admin side is blind)

This is where the journey BREAKS for admin/back-end visibility:

### Gap 1 — Admin can't see who's Premium vs Free
- `AdminUsers.tsx` and `AdminUserDetail.tsx` query `profiles` and `event_plans` (transformation plans like Madhavan/Sugar Cut)
- **Neither queries the `subscriptions` table.**
- Admin sees a user but has no idea if they're Free, Trial, Pro, or Ultra.

### Gap 2 — Admin Revenue page tracks the wrong thing
- `AdminRevenue.tsx` line 34 only reads `event_plans` and uses hardcoded `PLAN_PRICE_INR` for transformation plans
- Subscription revenue (₹149/mo, ₹1,499/yr from `payment_events`) is **completely absent**
- "Revenue today" KPI on `AdminOverview.tsx:215` is wrong — labelled "mock until payments live" but doesn't even include the mock subscription payments we DO have

### Gap 3 — No subscription analytics anywhere
- No MRR / ARR
- No active vs trialing vs cancelled split
- No churn from `subscriptions.cancel_at_period_end`
- No conversion funnel (free → trial → paid)

### Gap 4 — Admin can't manage a user's subscription
- `AdminUserDetail` lets admin extend/refund **event_plans** but cannot:
  - Comp a user a free month of Pro
  - Force-cancel a stuck subscription
  - View their payment history
  - See payment method on file

### Gap 5 — Audit log doesn't capture subscription events
- `payment_events` has rows but they don't propagate to `audit_logs`
- No subscribe/cancel/refund visible in `/admin/audit`

---

## 🟡 Minor Gaps (user-facing polish)

| # | Item | Impact |
|---|---|---|
| 1 | `PaywallScreen` floor for social proof is `12,847` even when DB count is 1 — the "honest" floor lies a bit | Cosmetic |
| 2 | `BillingHistorySheet` filters only by `event_type='subscribe'` and trusts RLS for user_id scope — works but should explicitly add `.eq('user_id', user.id)` for safety | Defense-in-depth |
| 3 | `ManageSubscriptionSheet` doesn't show next charge amount, only date | UX polish |
| 4 | No "Pause subscription" button despite plan mentioning it | Feature drop vs spec |
| 5 | Cancel button in Manage sheet doesn't trigger `RetentionOfferScreen` — goes straight to cancel | UX regression vs spec |
| 6 | No push/email reminder 3 days before renewal (planned for "real provider day") | Deferred |

---

## 📋 Implementation Checklist (what I'll build to close the gaps)

### Part A — Admin subscription visibility (~3 files)

**A1. Add Subscriptions column to `AdminUsers.tsx`**
- Join `subscriptions` into the user list query
- New column: badge showing `Free` / `Trial` / `Pro Yearly` / `Pro Monthly` / `Ultra` / `Cancelling`
- Filter chips: "Show only paying users", "Show only trial users"

**A2. Add Subscription panel to `AdminUserDetail.tsx`**
- New section above "Plans": current subscription, trial end, period end, payment method, cancel_at_period_end
- Shows last 10 `payment_events` for this user (subscribe / cancel / trial_started)
- Action buttons (super-admin only): "Comp 1 month Pro", "Force cancel", "End trial early"
- Each action writes to `audit_logs`

**A3. New `AdminSubscriptions.tsx` page**
- KPIs: Total paying, Trialing, MRR (₹), ARR (₹), This-month new, This-month churn
- Time-series chart: subscribe events vs cancel events (last 30d)
- Conversion funnel: free → trial → paid → still active
- Table of recent `payment_events` with filters

**A4. Fix `AdminRevenue.tsx` to include subscription revenue**
- Add second data source: sum `payment_events.amount_inr` for `event_type='subscribe'` (excluding `mock=true` if env says so)
- Split UI: "Subscription revenue" + "Event-plan revenue" instead of conflating
- Real ARPU from both sources

**A5. Pipe `payment_events` into `audit_logs`**
- Trigger on `payment_events INSERT` → mirror to audit_logs with action `subscribe`/`cancel`/`refund`
- One DB migration

### Part B — User-side polish (~3 files)

**B1. Fix social proof floor in `PaywallScreen`**
- Show `12,847` only as a launch baseline; once DB > 100, use real count

**B2. Wire RetentionOfferScreen into Manage cancel flow**
- `ManageSubscriptionSheet.handleCancel` → first show `<RetentionOfferScreen />` → if user still cancels, then call `cancelSubscription()`

**B3. Add explicit user_id scoping to `BillingHistorySheet`**
- `.eq('user_id', user.id)` even though RLS protects it

**B4. Add next-charge amount to Manage sheet**
- Read latest `payment_events.amount_inr` and show "₹1,499 will be charged on May 23"

### Part C — Verification suite (~1 file)

**C1. Manual test script in `/tmp`** that walks the full flow end-to-end:
1. Free user signs in → no premium features
2. Open paywall → pick yearly → "Pay" → assert `subscriptions.plan='premium'`, `payment_events` row written
3. Refresh app → `getPlan()` returns `premium` from server
4. Open Manage sheet → see plan + history
5. Cancel → assert `cancel_at_period_end=true`
6. Admin opens user detail → sees Pro badge + payment history

---

## ⏱ Effort & order

| Order | Work | Effort |
|---|---|---|
| 1 | A1 + A2 (admin can SEE subs) | 45 min |
| 2 | A5 (audit pipeline migration) | 15 min |
| 3 | A3 (AdminSubscriptions page + nav link) | 60 min |
| 4 | A4 (revenue page fix) | 30 min |
| 5 | B1, B2, B3, B4 (user-side polish) | 40 min |
| 6 | C1 (verification walkthrough) | 15 min |

**Total: ~3.5 hours.** After this, admin has full real-time visibility into every subscription event, user-side polish matches the original spec, and the only thing left for "real provider day" is swapping `mock-subscribe` → `create-checkout`.

---

## Reply with one of

- **"Build all of it"** → I do A1–A5 + B1–B4 + C1 in one go
- **"Admin first"** → just A1–A5 (most critical gap)
- **"User polish first"** → just B1–B4
- **"Pick and choose"** → tell me which items

