

# Phase 11 — Security Hardening (7 Blockers)

Lock down the 7 critical vulnerabilities found in the audit. One migration per blocker so each is reviewable and reversible. Order: most dangerous first.

> **Note on blocker #6:** Backend rate-limiting primitives don't exist yet in this stack. I'll implement a lightweight ad-hoc check using `api_usage` row counts as you specified, but flagging it as best-effort (not bulletproof against burst attacks). All other blockers are clean RLS fixes.

---

## Blocker #4 — `user_roles` privilege escalation 🔴 CRITICAL

**Problem:** Current policy `Admins can manage roles` lets anyone with `admin` role grant themselves `owner`. No audit trail on role changes.

**Fix (migration 1):**
- DROP `Admins can manage roles` and `Admins can read all roles` policies.
- Keep only: `Owners manage roles` (ALL) + `Users can read own roles` (SELECT) + new `Admins read all roles` (SELECT only, no write).
- Add `BEFORE INSERT/UPDATE/DELETE` trigger `audit_user_role_changes()` → writes actor, target, old/new role to `audit_logs`.

---

## Blocker #1 — `ad_campaigns` cross-brand tampering

**Problem:** `Authenticated can update campaigns` lets ANY logged-in user edit ANY brand's budget/status.

**Fix (migration 2):**
- DROP `Authenticated can update campaigns` and `Authenticated can insert campaigns`.
- ADD `Brand members manage own campaigns` (INSERT/UPDATE) using `is_brand_member(brand_id)`.
- ADD `Admins manage all campaigns` (ALL) using `has_role` checks.
- Edge function `select-ads` uses service-role, unaffected.

---

## Blocker #2 — `ad_targeting` cross-brand tampering

**Problem:** Same issue — anyone can rewrite any campaign's targeting.

**Fix (migration 3):**
- DROP `Authenticated can insert targeting` + `Authenticated can update targeting`.
- ADD scoped policies that check the parent campaign's `brand_id` via subquery to `ad_campaigns` + `is_brand_member`.

---

## Blocker #3 — `brand_accounts.balance` writable

**Problem:** `Authenticated can update brands` lets brand members directly edit `balance` (bypassing `brand_transactions` ledger).

**Fix (migration 4):**
- DROP `Authenticated can update brands` + `Authenticated can insert brands`.
- ADD `Brand members update brand profile` (UPDATE) but with column-level grant: revoke UPDATE on `balance` from authenticated; only admins/service-role can touch balance.
- ADD trigger `block_balance_direct_write()` → raises exception unless `current_setting('role') = 'service_role'` or actor has admin role.
- Balance changes must flow through a new SECURITY DEFINER function `apply_brand_transaction(brand_id, amount, type, ref)` that inserts into `brand_transactions` AND updates `balance` atomically.

---

## Blocker #5 — `profiles` PII leak to marketers

**Problem:** `Marketers read all profiles` returns unmasked email/phone/health data.

**Fix (migration 5):**
- DROP `Marketers read all profiles` policy.
- CREATE SECURITY DEFINER view `public.profiles_masked` exposing only: `id, name, city, gender, age, goal, marketing_consent, join_date` + `mask_email(email)` helper.
- GRANT SELECT on view to authenticated.
- Add view-level policy: only marketers/support/admins can SELECT.
- Update `src/pages/admin/AdminUsers.tsx` and `AdminUserDetail.tsx` to query `profiles_masked` when `isMarketer && !isAdmin`.

---

## Blocker #6 — Rate limit `analyze-food` + `monika-chat` ⚠️ ad-hoc

**Caveat:** No proper rate-limit infrastructure exists. Implementing a soft cap by counting recent `api_usage` rows for the user.

**Fix (no migration, edge-function edit):**
- Add helper `supabase/functions/_shared/rate-limit.ts`:
  - Query `api_usage` WHERE `metadata->>'user_id' = X AND endpoint = Y AND created_at > now() - interval '1 minute'`.
  - If count ≥ 10, return 429 with `Retry-After: 60`.
- Wire helper at top of `analyze-food/index.ts` and `monika-chat/index.ts`.
- Client toast on 429: "You're going a bit fast — try again in a moment."

---

## Blocker #7 — `daily_logs` optimistic locking

**Problem:** Concurrent multi-device writes silently overwrite each other (last-write-wins on JSONB blob).

**Fix (migration 6 + client edit):**
- Add SECURITY DEFINER function `upsert_daily_log(p_user uuid, p_date text, p_data jsonb, p_expected_updated_at timestamptz)`:
  - If row exists and `updated_at != p_expected_updated_at` → RAISE 'CONFLICT' with code `P0409`.
  - Else upsert and return new row with fresh `updated_at`.
- Update `src/lib/cloud-sync.ts`:
  - Track last-known `updated_at` per log_date.
  - Call new RPC instead of direct upsert.
  - On `P0409`: re-fetch server row, deep-merge with local pending changes (server wins on conflicting meal IDs, local wins on new entries), retry once.

---

## Execution Order

1. Migration 1 — `user_roles` lockdown + audit trigger
2. Migration 2 — `ad_campaigns` brand-scoped RLS
3. Migration 3 — `ad_targeting` brand-scoped RLS
4. Migration 4 — `brand_accounts` balance protection + `apply_brand_transaction` RPC
5. Migration 5 — `profiles_masked` view + revoke marketer raw SELECT
6. Edge edits — `analyze-food` + `monika-chat` rate limit
7. Migration 6 — `upsert_daily_log` RPC + `cloud-sync.ts` retry logic
8. Re-run security scanner after migrations 1, 4, 5, 6 (the structural ones)
9. Mark fixed findings in scanner; report final verdict

---

## Files Touched

**Migrations (6 new):** one per blocker as listed.

**Edge functions:**
- `supabase/functions/_shared/rate-limit.ts` (new)
- `supabase/functions/analyze-food/index.ts` (edit)
- `supabase/functions/monika-chat/index.ts` (edit)

**Client code:**
- `src/lib/cloud-sync.ts` (optimistic-lock retry)
- `src/pages/admin/AdminUsers.tsx` (use masked view for marketers)
- `src/pages/admin/AdminUserDetail.tsx` (same)
- `src/pages/brand/BrandBilling.tsx` (call `apply_brand_transaction` RPC instead of direct balance update — if any such call exists)
- `src/pages/admin/AdminBrandDetail.tsx` (same)

---

## What I will NOT touch (saved for Phase 12/13)

- Razorpay integration
- Privacy Policy / ToS pages
- Sentry / error monitoring
- Health disclaimers
- Pagination on Progress / FoodArchive

---

## Stop Condition

After all 7 blockers + final scanner run, I'll report:
- 🟢 fixed count
- 🟡 anything that surfaced new findings
- Updated launch verdict (expect: "ready for closed beta of ≤100 users pending Phase 12 legal/monitoring")

