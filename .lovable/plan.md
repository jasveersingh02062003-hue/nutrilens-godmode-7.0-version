

# 🔧 Fix Build + Finish Sprint Wrap-Up

## Part 1 — Fix the build error (5 min)

**File:** `src/pages/Profile.tsx` (line 562)

The dev panel's "set plan" buttons reference `setPlan` (which no longer exists as a real setter — it's a deprecated no-op in `subscription-service.ts`). In the new server-backed model, plan flips must go through the `mock-subscribe` edge function.

**Change** the dev panel buttons to:
- `'free'` → call `cancelSubscription()` (already async, immediate downgrade)
- `'premium' | 'ultra'` → call `await mockSubscribe(p)`
- After success, call `await refreshPlan()` then `setCurrentPlan(getPlan())` so UI reflects server state
- Wrap in async handler with try/catch + toast

No new imports needed — `mockSubscribe`, `cancelSubscription`, `refreshPlan` are already imported on line 27.

## Part 2 — Wire server-side tier check into AI edge functions (~20 min)

**File:** `supabase/functions/_shared/ai-quota.ts` (lines 85-89)

Replace the hardcoded `const tier: QuotaTier = "free"` with a real lookup:

```ts
const { data: planRow } = await userClient.rpc("get_my_active_plan");
const row = Array.isArray(planRow) ? planRow[0] : planRow;
const isActiveOrTrial = row?.status === "active" || row?.status === "trialing";
const tier: QuotaTier = isActiveOrTrial && (row?.plan === "premium" || row?.plan === "ultra")
  ? row.plan
  : "free";
```

This closes **FB-2** (paid-tier spoofing) — `monika-chat`, `analyze-food`, `scan-receipt` all import `checkQuota`, so this single change tier-gates all three.

## Part 3 — Set the dev mock-payments secret (1 min)

The `mock-subscribe` edge function is currently gated by a `DEV_MOCK_PAYMENTS=true` secret. We need to add it so the dev panel can flip plans. (For closed beta we keep this enabled; for public launch we remove it.)

Use `add_secret` to set:
- `DEV_MOCK_PAYMENTS` = `true`

## Part 4 — End-to-end smoke test (~10 min)

After deploy, run via `supabase--curl_edge_functions`:

1. `GET /healthz` → expect 200, `{status:"ok"}`
2. `POST /mock-subscribe` with `{"plan":"premium"}` → expect 200
3. `supabase--read_query`: `SELECT plan, status FROM subscriptions WHERE user_id = auth.uid()` → expect `premium / active`
4. `POST /monika-chat` with a sample message → expect 200 (now using premium quota of 200/day instead of free 5/day)
5. `POST /cancel-subscription` → expect 200, row shows `cancel_at_period_end=true`

## Part 5 — Update plan doc + create tracking tasks

- Tick W2 (subscription core) items as ✅ done in `.lovable/plan.md`
- Note remaining gaps: real payment provider (deferred), Sprint 2A leftovers (W2-1 offline queue, W2-3 Sentry, SEC-3 vector schema move), Sprint 2B (funnel events + push)

## Files touched

| File | Change |
|---|---|
| `src/pages/Profile.tsx` | Dev panel: `setPlan` → `mockSubscribe` / `cancelSubscription` + `refreshPlan` |
| `supabase/functions/_shared/ai-quota.ts` | Server-side tier lookup via `get_my_active_plan()` |
| `.lovable/plan.md` | Tick subscription-core complete |

Plus: add `DEV_MOCK_PAYMENTS=true` runtime secret, redeploy 3 AI edge fns + mock-subscribe, run end-to-end test.

**Estimated total: ~40 minutes** to ship the fix + close FB-2 + verify the whole subscription pipeline works end-to-end.

## What this leaves on the board

- 🟢 FB-1 (subscription in localStorage) — closed
- 🟢 FB-2 (client-side tier check) — closed after Part 2
- ⬜ FB-3 (funnel events not fired) — Sprint 2B
- ⬜ FB-4 (push notifications stub) — Sprint 2B
- ⬜ Real payment provider (Razorpay/Stripe) — when account ready

After this lands, the next recommended sprint is **Sprint 2B (analytics + push)** for retention, or **"Plug in Lovable Stripe"** when you're ready to take real money (~30 min once you say go).

