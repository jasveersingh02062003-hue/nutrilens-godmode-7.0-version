

# Phase 11 Finalization — Brand Balance RPC Wiring

Wire the two admin pages to the new `apply_brand_transaction` RPC so balance edits stop failing against the direct-write trigger.

## Changes

### 1. `src/pages/admin/AdminBrands.tsx` (~line 78)
Replace the `adjustBalance` handler:
- Currently calls `supabase.from('brand_accounts').update({ balance: num })` → blocked by `block_brand_balance_direct_write` trigger.
- New flow:
  1. Compute delta: `delta = newBalance - currentBalance`.
  2. Pick `type`: `'adjustment'` (signed delta supported by RPC).
  3. Call `supabase.rpc('apply_brand_transaction', { p_brand_id, p_amount: delta, p_type: 'adjustment', p_reference: 'admin_manual', p_notes: 'Manual balance adjustment' })`.
  4. On success: toast + reload. On error: show RPC error message.
- Keep the existing `logAdminAction` audit call (RPC already records ledger; admin audit stays for UI traceability).

### 2. `src/pages/admin/AdminBrandDetail.tsx` (~line 81)
Same pattern. Additionally:
- If the page has separate "Top up" / "Refund" / "Debit" buttons, route each to the RPC with the correct `p_type`:
  - Top up → `'topup'` (positive amount)
  - Refund → `'refund'` (positive amount)
  - Debit → `'debit'` (positive amount, RPC subtracts)
  - Manual adjust → `'adjustment'` (signed)
- After RPC succeeds, refetch both `brand_accounts` row and `brand_transactions` ledger so the UI shows the new entry immediately.

### 3. Optional UX polish
- Disable the submit button while the RPC is in flight.
- Show the new ledger entry's `id` (returned by RPC) in the success toast: "Transaction recorded".

## Verification

After edits:
1. As an owner/admin in preview: adjust a brand balance → should succeed and create a `brand_transactions` row.
2. As a non-admin: same action → RPC raises `42501` (already enforced server-side).
3. Re-run security scanner → expect no new findings (this is purely client wiring).

## Out of scope (still deferred to Phase 12+)

- Blocker #6 (backend rate limiting) — needs infra, not addressed here.
- Razorpay, legal pages, Sentry, disclaimers, pagination.

## Stop condition

Two file edits, one verification round, then Phase 11 closes at 100%. Verdict update: still `🔴 NO LAUNCH` overall (Phase 12 legal + monitoring required), but security blockers section flips to 🟢.

