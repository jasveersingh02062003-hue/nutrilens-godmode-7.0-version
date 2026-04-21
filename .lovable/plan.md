

# Phase 0 — Unblock (Today)

Scope locked to **0.1 admin role** + **0.3 barcodes**. Govt API (0.2) deferred until you have the data.gov.in key.

---

## 0.1 — Seed Your Admin Role (5 min)

**What I need from you:** Paste your auth user ID (UUID format like `a1b2c3d4-...`) in the next chat message. Find it in **Lovable Cloud → Users → click your account → copy User ID**.

**What I'll do once you paste it:**
1. Insert one row into `user_roles`: `(your_user_id, 'admin')` via the data-insert tool.
2. Verify by reading back the row.
3. Tell you to refresh and visit `/admin/ads` — the page should now load instead of showing "Access denied".

**Files touched:** None. Pure data insert.

---

## 0.3 — Seed Barcodes for Missing Products (~1 hr)

Current state: **55 of 123** packed_products have barcodes. **68 missing.** Approach = manual curation first, then Open Food Facts API for the long tail.

### Step A — Manual seed of top 30 Indian protein products (15 min)

I'll write a one-shot SQL UPDATE migration for the 30 highest-value missing items. Targeting brands you actually carry where I can verify EAN-13s from public sources:
- **Amul Pro** protein milkshakes (chocolate, vanilla, kesar)
- **MuscleBlaze** protein bars + shakes (chocolate, cookies & cream, fudge brownie)
- **Yogabar** protein bars (multigrain, chocolate cranberry, almond fudge)
- **Fast&Up** protein water + reload
- **Epigamia** protein smoothies
- **Ensure** / **SuperYou** / **Hersheys** protein shakes

For each I'll set `barcode` (real EAN-13) + `affiliate_links` (Amazon.in + Flipkart search URLs, since deep ASIN links rot fast).

### Step B — Open Food Facts edge function for the remaining ~38 (45 min)

Create new edge function: `supabase/functions/seed-barcodes-off/index.ts`

```text
   ┌──────────────────────────────────────────┐
   │  seed-barcodes-off (admin-only, manual) │
   ├──────────────────────────────────────────┤
   │  1. SELECT products WHERE barcode IS NULL│
   │  2. For each: query                      │
   │     world.openfoodfacts.org/cgi/search   │
   │     ?search_terms={brand}+{product}      │
   │     &countries=india&json=1              │
   │  3. If hit: UPDATE barcode + (optional)  │
   │     fill missing nutrition from OFF      │
   │  4. Rate limit: 1 req/sec (OFF policy)   │
   │  5. Return summary {found, missed, errors}│
   └──────────────────────────────────────────┘
```

Function rules:
- `verify_jwt = true`, gated by `has_role(auth.uid(), 'admin')` check at top
- Service-role client for the UPDATE
- Logs each match for audit
- Idempotent — only touches rows where `barcode IS NULL`

I'll add a small **"Seed barcodes from OFF"** button in `src/pages/AdAdmin.tsx` that calls this function and shows the result toast. One click, runs ~38 lookups, takes ~45 sec.

---

## 0.2 — Govt Mandi API (DEFERRED)

Skipped this round per your choice. When you have the key from data.gov.in, ping me and I'll:
1. Add `GOVT_MANDI_API_KEY` secret
2. Replace the placeholder `fetchMandiPrices()` in `supabase/functions/fetch-govt-prices/index.ts` with the real agmarknet call
3. Verify cron (`govt-prices-daily`) populates `city_prices` with `source='govt_mandi'`

---

## Technical Details

| Item | Type | File / Table | Tool used |
|------|------|--------------|-----------|
| 0.1 admin row | Data | `user_roles` | insert tool |
| 0.3a manual barcodes | Data | `packed_products` UPDATEs | insert tool (UPDATE statements) |
| 0.3b OFF function | New code | `supabase/functions/seed-barcodes-off/index.ts` | edge function deploy |
| 0.3b admin button | UI | `src/pages/AdAdmin.tsx` | code edit |

**No schema migrations** — `barcode` and `affiliate_links` columns already exist on `packed_products`.

**Security:** OFF function checks admin role server-side before any write. No secrets needed (OFF API is free + keyless).

**Rollback:** All UPDATEs are non-destructive (only fill NULLs). To undo, run `UPDATE packed_products SET barcode = NULL WHERE updated_at > '2026-04-21'`.

---

## What Happens After You Approve

1. You paste your user ID → I run the admin INSERT → confirm.
2. I run the 30-row manual barcode UPDATE migration → confirm count.
3. I write + deploy `seed-barcodes-off` function and add the admin button.
4. You click the button on `/admin/ads` → OFF backfill runs → I report final coverage (target: 95+ of 123 with barcodes).

Total: ~1 hr of my work, 5 min of clicks from you.

