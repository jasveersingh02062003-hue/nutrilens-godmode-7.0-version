

# Phase 12 Wrap-Up + Phase 14 (Polish) — Skipping Razorpay

Per your direction: leave Razorpay/Phase 13 untouched. Close the remaining Phase 12 verification gaps, then move into Phase 14 post-launch polish items that don't depend on payments.

---

## Part A — Phase 12 Verification & Loose Ends

### A1. Consent records table check
Verify `consent_records` table exists with proper schema (the signup flow in `Auth.tsx` writes to it). If missing, add migration:
- Columns: `id uuid pk`, `user_id uuid → auth.users`, `consent_type text` (e.g., `terms_privacy`), `version text`, `granted_at timestamptz`, `ip_address text nullable`, `user_agent text nullable`.
- RLS: users can insert/select their own; admins can select all.

### A2. Pagination on `Progress` page (#12 follow-up)
Audit found `Progress.tsx` reads from local storage so Supabase 1000-row cap doesn't apply — but add a defensive `LIMIT` to any direct `daily_logs` queries elsewhere (e.g., `cloud-sync.ts` history fetches) to prevent silent truncation as users mature past 1000 days.

### A3. Sentry DSN status
Already wired in code; just confirms with you that you'll add `VITE_SENTRY_DSN` in Workspace → Build Secrets when ready. No-op until then (safe default).

---

## Part B — Phase 14 Post-Launch Polish (Razorpay-independent)

### B1. GST invoice PDF generation (#13)
- New `src/lib/gst-invoice.ts`: builds a compliant Indian GST invoice (invoice no., date, brand GSTIN placeholder, HSN/SAC for "Online Advertising Services" = 998365, CGST/SGST/IGST split, QR code area).
- Replace CSV download in `BrandBilling.tsx` with PDF (using `jspdf` already in deps if present, else add).
- Configurable: GSTIN per `brand_accounts` (add column `gstin text nullable`), and a single `seller_gstin` env constant for NutriLens.
- Migration: `ALTER TABLE brand_accounts ADD COLUMN gstin text, billing_address jsonb`.

### B2. Ad fraud / click-bomb protection (#14)
- New edge function `log-ad-event` already exists — extend it:
  - Reject duplicate `(user_id, ad_id, event_type)` within 30 seconds (in-memory + DB lookup against `ad_events`).
  - Reject more than 5 clicks/min per user across all ads (uses `ad_events` count).
  - Reject events from same `user_id` on same `campaign_id` after `daily_click_cap` (new column on `ad_campaigns`, default 10).
- Migration: `ALTER TABLE ad_campaigns ADD COLUMN daily_click_cap int DEFAULT 10`.
- Add `is_suspicious boolean` to `ad_events` so fraud-flagged events are excluded from billing in `select-ads` cost rollup.

### B3. DPDP data-export endpoint (#15)
- New edge function `export-user-data`:
  - Auth: requires logged-in user; only exports own data.
  - Aggregates: `profiles`, `daily_logs`, `weight_logs`, `water_logs`, `supplement_logs`, `consent_records`, `ad_events` (own).
  - Returns ZIP-streamed JSON files (one per table) + a `manifest.json`.
  - Audit-log the export to `audit_logs`.
- New button in `src/pages/Profile.tsx` → "Download my data" → calls function → triggers download.

### B4. Backup restore drill (#16)
- Documentation only: add `docs/BACKUP_RESTORE.md` with quarterly drill checklist (Lovable Cloud auto-backups, manual SQL export via `pg_dump`, restore-test procedure on a remix project).
- Calendar reminder is on you — no code change needed.

---

## Execution Order

1. **A1** — consent table migration (verify/create)
2. **A2** — defensive `LIMIT` on `daily_logs` history queries
3. **B1** — GST invoice (migration + PDF generator + BrandBilling swap)
4. **B2** — fraud protection (migration + edge function update)
5. **B3** — data export edge function + Profile button
6. **B4** — `docs/BACKUP_RESTORE.md`
7. Final: re-run security scanner, summarize verdict

---

## Files Touched

**Migrations:** consent_records (if missing), brand_accounts GST cols, ad_campaigns click cap, ad_events suspicious flag.

**New:**
- `src/lib/gst-invoice.ts`
- `supabase/functions/export-user-data/index.ts`
- `docs/BACKUP_RESTORE.md`

**Edited:**
- `supabase/functions/log-ad-event/index.ts`
- `src/pages/brand/BrandBilling.tsx`
- `src/pages/Profile.tsx`
- `src/lib/cloud-sync.ts` (defensive limits)

---

## Out of scope (per your instruction)

- Phase 13 Razorpay integration — space reserved, not implemented. `BrandBilling.tsx` will keep "Contact account manager to top up" copy.

## Stop condition

After B4 ships and scanner passes, verdict flips to:
**🟢 Closed beta ready (≤500 users) + post-launch polish complete. Public launch gated only on Razorpay (Phase 13) when you're ready.**

