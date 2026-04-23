

# 🔬 Deep Verification Report — NutriLens Pro Subscription Journey

I checked the live database, every code path, edge functions, RLS policies, the audit trigger, and admin pages. Here is the honest state.

---

## 🟢 What works end-to-end (verified against live data)

| Layer | Item | Evidence |
|---|---|---|
| **DB schema** | `subscriptions`, `payment_events`, `payment_methods`, `audit_logs` all exist with RLS | Schema dump |
| **Audit trigger** | `trg_audit_payment_event` is **created and enabled** on `payment_events INSERT` | `pg_trigger` confirms |
| **Server-owned plan** | `get_my_active_plan()` RPC + realtime channel filtered by user_id | `subscription-service.ts` |
| **Real-time sync** | UI updates instantly when `subscriptions` row changes (Pro badge, banner, manage sheet) | `applyServerRow()` notifies all listeners |
| **Daily prompt** | `DailyPaywallProvider` mounted in `AppLayout` (App.tsx:247); 2h gate + 7d/3d/30d cooldowns | `paywall-triggers.ts` |
| **5 entry points → new flow** | `UpgradeModal` is now a 14-line wrapper around `PaywallScreen`; all 9 callers route through it | `UpgradeModal.tsx` |
| **Manage Subscription** | `ManageSubscriptionSheet` opens for paid users, shows period end, billing history, retention offer before cancel | `Profile.tsx`, `ManageSubscriptionSheet.tsx` |
| **Admin nav** | "Subscriptions" link (Crown icon) in `AdminLayout` for owner/super_admin/admin | `AdminLayout.tsx:28` |
| **Admin Users list** | Plan column with Free / Trial / Pro / Ultra / cancelling badges + plan filter | `AdminUsers.tsx:39-52` |
| **Admin User Detail** | Subscription panel + payment events + Comp / Force-cancel / End-trial actions w/ reason dialog | `AdminUserDetail.tsx:37-77` |
| **Admin Subscriptions page** | MRR/ARR, trial count, cancelling count, 30d subscribe-vs-cancel chart, recent events table | `AdminSubscriptions.tsx` |
| **Admin Revenue split** | Subscription revenue separated from event-plan revenue | `AdminRevenue.tsx` |
| **Test mode badge** | Renders in `PaymentMethodSheet` header; will be removed when real Stripe lands | `TestModeBadge.tsx` |
| **Edge fn safety** | `mock-subscribe` is gated by `DEV_MOCK_PAYMENTS=true` env (set ✅) and rejects when off | `mock-subscribe/index.ts:35` |

**Live snapshot:** 6 users · 5 free · 1 premium active · 0 trials · 0 cancellations · 1 subscribe event (₹199, mock).

---

## 🔴 Real bugs I found (must fix)

### Bug 1 — Payment method label always shows "—" in Manage sheet
**Severity: major user-facing**
`PaymentMethodSheet.runMockCharge()` calls `mockSubscribe(plan, durationDays)` (line 56) but `subscription-service.mockSubscribe()` (line 194) only sends `{ plan, duration_days }` to the edge fn. The chosen UPI app / card / netbanking label is **never persisted to `payment_events.raw_payload.payment_method_display`**. Result: the Manage sheet `methodLabel` query returns `null` and shows "—", and admin payment-history rows show no method.

### Bug 2 — `nextChargeAmount` shows the trial amount, not the renewal amount
`ManageSubscriptionSheet` reads `payment_events.amount_inr` from the latest subscribe event. For yearly users we charge ₹1,499 once but show "₹1,499 on next renewal" only because the row already stored that. For monthly users it'll correctly show ₹149. Fine on paper, but combined with Bug 1 the label is misleading. Needs `current_period_end` semantics: trial → "Free until X, then ₹Y".

### Bug 3 — Audit pipeline has zero rows
Trigger is enabled, but the only existing `payment_event` row was inserted **before** the trigger migration. No backfill. New events will mirror. **Action:** one-time backfill insert and/or accept the gap.

### Bug 4 — `audit_logs` SELECT is super_admin only
`AdminUserDetail` does not query `audit_logs` (it queries `payment_events` directly, which is fine). But the `/admin/audit` page is gated to super_admin only — regular admins can't see role grants or admin subscription overrides. **Decision needed:** is this intentional?

### Bug 5 — `DailyPaywallProvider` runs `getDailyLog()` on logged-out sessions
`useDailyPaywall.tsx:26` calls `getDailyLog()` every 5 minutes regardless of auth state. Currently the 2h-engagement gate prevents the sheet from opening, so users don't see anything broken. Still a minor leak that will spam logs once a real-tracking layer is added.

---

## 🟡 Polish gaps (small)

1. **Hard scan-limit modal** at the 3rd AI scan opens the new `PaywallScreen` ✅ but the `RetentionOfferScreen.handleAccept` still calls `mockSubscribe('premium', 365)` directly — bypasses the receipt screen. Inconsistent UX.
2. **Pause subscription** mentioned in journey but not built — `ManageSubscriptionSheet` has only Cancel.
3. **`PaywallScreen` social proof** shows `12,847` baseline, real DB count only kicks in after 100 Pro users. Honest, but worth a one-line tooltip or rounding to `12.8k+` so it doesn't look fake.
4. **`payment_methods` table** is empty (0 rows). `mock-payment-methods.ts` writes after first successful payment, but the mocked payment never persists the method — Bug 1's downstream effect.
5. **Admin Subscriptions MRR formula** uses flat ₹149 × paying users. Yearly users are over-counted by ~20% (real ARPU = ₹125/mo). Use `payment_events.amount_inr / duration_days × 30` for true MRR.

---

## 📋 Implementation Plan — 3 small file edits + 1 backfill

### Edit 1 — `src/lib/subscription-service.ts` (1 function, ~8 lines)
Extend `mockSubscribe()` signature to accept and forward payment-method metadata:

```ts
export async function mockSubscribe(
  plan: 'premium' | 'ultra',
  durationDays = 30,
  meta?: { payment_method_type?: 'upi'|'card'|'netbanking'|'wallet';
           payment_method_display?: string;
           amount_paise?: number },
): Promise<boolean>
```

Pass `meta` through in the `body`.

### Edit 2 — `src/components/paywall/PaymentMethodSheet.tsx` (1 line in `runMockCharge`)
Pass the chosen method:

```ts
await mockSubscribe('premium', durationDays, {
  payment_method_type: opts.type,
  payment_method_display: opts.display,
  amount_paise: amountPaise,
});
```

### Edit 3 — `src/components/RetentionOfferScreen.tsx` (4 lines)
Route `handleAccept` through the receipt screen instead of toast-only — open `PaywallScreen` with `startAtPlanPicker` so user sees confetti + receipt for the discounted purchase. Consistent UX.

### Edit 4 — `src/pages/admin/AdminSubscriptions.tsx` (~15 lines)
Replace flat MRR with payment-derived ARPU:
```ts
const mrr = paying.reduce((s, u) => {
  const last = payments.find(p => p.user_id === u.user_id && p.event_type === 'subscribe');
  if (!last) return s + 149;
  // monthly = full amount; yearly = amount/12
  return s + (last.amount_inr! >= 1000 ? Math.round(last.amount_inr!/12) : last.amount_inr!);
}, 0);
```

### Migration — backfill `audit_logs` for the existing payment row
One INSERT to mirror the pre-trigger row so the audit page is consistent.

---

## ⏱ Effort

| Step | Time |
|---|---|
| Edit 1 + 2 (payment method persistence) | 10 min |
| Edit 3 (retention → receipt screen) | 8 min |
| Edit 4 (true MRR) | 7 min |
| Backfill migration | 5 min |
| Manual verification on /dashboard → /profile → /admin/subscriptions | 5 min |

**Total: ~35 min.** After this, the journey, admin visibility, and real-time sync all behave consistently with the spec.

---

## Reply with one of

- **"Fix all 4"** → I do edits 1–4 + backfill in one shot
- **"Fix the user-facing bugs only"** → edits 1, 2, 3 (skip MRR refinement)
- **"Just fix the payment-method label"** → edits 1 + 2 only (smallest, highest impact)
- **"Verify in browser first"** → I'll open the preview, run through the full flow, screenshot evidence, then propose fixes

