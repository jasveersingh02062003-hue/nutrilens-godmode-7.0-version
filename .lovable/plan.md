
# NutriLens Production Hardening — Batch 1 (No Email Work)

Email-dependent work (transactional emails, dunning notices, intake-approval emails) is **DEFERRED** until you have a verified domain. Everything below ships without it.

---

## What we ship in this session

| # | Item | Why it blocks launch | Risk if skipped |
|---|---|---|---|
| 1 | Fix `brand-kyc` storage INSERT policy | Any logged-in user can write into any brand's KYC folder today | Cross-tenant data tampering |
| 2 | Defense-in-depth on `price_alert_notifications` realtime | Confirm channel auth respects RLS; harden REPLICA IDENTITY | Other users' alerts could leak via realtime broadcast |
| 3 | DPDP consent capture on signup | `consent_records` table is empty — illegal to operate in India without explicit consent | Legal / regulatory blocker |
| 4 | Guard `DEV_MOCK_PAYMENTS` so it cannot be true in live mode | If left enabled in prod, real payments are bypassed | Revenue loss + accounting chaos |
| 5 | Brand wallet self-serve top-up via Paddle | Only admins can top up brand wallets today (no self-serve revenue from advertisers) | Brand portal cannot generate revenue without manual ops |

After this batch the only remaining launch blockers are external-only: Paddle KYB verification (you do this in the Payments tab) and email infra (waiting on your domain).

---

## Detailed plan

### 1. brand-kyc storage policy (5 min)
**Problem:** current INSERT policy allows any authenticated user to upload into any folder under `brand-kyc`.

**Fix:**
- Drop the existing `"Brand members upload KYC docs"` INSERT policy.
- Add a new INSERT policy that requires:
  - `bucket_id = 'brand-kyc'` AND
  - `(storage.foldername(name))[1]::uuid` matches a brand the user belongs to (via `is_brand_member()`).
- Add matching SELECT/UPDATE/DELETE policies so brand members can only read/manage their own folder.
- Verify with a `pg_policies` query.

### 2. price_alert_notifications realtime hardening (5 min)
**Problem:** RLS SELECT is correct, but realtime broadcast filtering depends on REPLICA IDENTITY being set so RLS evaluates correctly per-row.

**Fix:**
- `ALTER TABLE price_alert_notifications REPLICA IDENTITY FULL;` so RLS sees every column at broadcast time.
- Confirm the table is in `supabase_realtime` publication (already verified).
- Document the channel-auth model in a code comment in the price-alerts hook.

### 3. DPDP consent on signup (15 min)
**Problem:** Indian DPDP Act requires explicit consent for processing health/personal data. `consent_records` has 0 rows.

**Fix:**
- On `/auth` signup form: add two checkboxes:
  - **Required** "I agree to the Privacy Policy and Terms of Service" (blocks signup if unchecked).
  - **Optional** "I want product updates and offers" (drives `marketing_consent`).
- After successful signup, insert two rows into `consent_records`:
  - `purpose='terms_privacy'`, `granted=true`
  - `purpose='marketing'`, `granted=<checkbox value>`
- Backfill existing users with a one-time banner on next login asking them to accept (new row in consent_records).
- Privacy/Terms links go to existing `/privacy` and `/terms` pages.

### 4. DEV_MOCK_PAYMENTS guard (5 min)
**Problem:** Secret exists; if it's `true` in live, mock subscriptions are created without real payment.

**Fix:**
- In `mock-subscribe` edge function: refuse to run if request comes from a live-environment Paddle token OR if env is detected as production. Returns 403 with clear error.
- Add a runtime check in `payments-webhook` that logs a warning if `DEV_MOCK_PAYMENTS=true` and a real Paddle webhook arrives.
- Add a frontend check: "Mock subscribe" button only renders in sandbox mode.

### 5. Brand wallet self top-up via Paddle (30 min)
**Problem:** Today, brand owners cannot top up their own wallet — only admins can via `apply_brand_transaction`. This blocks all advertiser revenue at scale.

**Fix:**
- New edge function `brand-wallet-checkout`: takes `brand_id` + `amount_inr`, verifies caller is an `owner` of that brand, returns a Paddle checkout URL with `customData = { brand_id, amount_inr, type: 'brand_topup' }`.
- Extend `payments-webhook` `transaction.completed` handler: if `customData.type === 'brand_topup'`, call `apply_brand_transaction(brand_id, amount, 'topup', paddle_txn_id, 'Self-serve top-up')` and create a notification for the brand.
- New "Top Up Wallet" button on `/brand/billing` (owner-only via existing `useBrandRole`). Modal with amount picker (₹5k, ₹10k, ₹25k, custom), opens Paddle overlay.
- Idempotency: `payments-webhook` must skip if a `brand_transactions` row with `reference = paddle_txn_id` already exists.

---

## Technical details

**Migrations (one combined migration):**
- Drop + recreate `storage.objects` policies for `brand-kyc` (4 policies: SELECT/INSERT/UPDATE/DELETE scoped by `is_brand_member`).
- `ALTER TABLE price_alert_notifications REPLICA IDENTITY FULL`.
- No new tables — `consent_records` already exists with correct RLS.

**Edge functions:**
- New: `brand-wallet-checkout` (creates Paddle checkout for brand top-up)
- Edit: `payments-webhook` (handle brand_topup customData)
- Edit: `mock-subscribe` (refuse in prod)

**Frontend changes:**
- `src/pages/Auth.tsx` — add consent checkboxes
- `src/pages/brand/BrandBilling.tsx` — add Top Up Wallet button + modal
- New: `src/components/brand/TopUpWalletDialog.tsx`
- New: `src/components/ConsentBackfillBanner.tsx` (one-time prompt for existing users)

**Files NOT touched:**
- Anything email-related (`send-transactional-email` function stays missing — `payments-webhook` calls to it remain but are logged-and-skipped)
- Consumer app routes
- Calorie engine / meal planner / dashboard
- Admin pages (already verified working)

**Verification after each step:**
- TS check (`tsc --noEmit`)
- `pg_policies` re-query for storage
- `cron.job` query for nothing (no new cron)
- Confirm three apps still load: `/dashboard`, `/brand`, `/admin`

---

## What's left for you (external only)

After this batch ships, the remaining production blockers are entirely on your side:
1. **Paddle Go-Live** — verify business in the Payments tab (KYB review takes 2–5 business days)
2. **Email domain** — when you have one, paste it and I'll wire up `send-transactional-email`, dunning notices, and intake-approval emails in one follow-up batch
3. **Privacy Policy / Terms legal review** — pages exist but should be reviewed by counsel for India + Paddle MoR requirements
4. **Real ₹1 end-to-end test transaction** — once Paddle is live

---

## Order of execution

I'll ship them in dependency order: 1 → 4 → 2 → 3 → 5. After each one, I'll TS-check and post a short "✅ done, moving to N+1" so you can stop me anytime.

Reply **"go"** to start, or tell me to drop/reorder any item.
