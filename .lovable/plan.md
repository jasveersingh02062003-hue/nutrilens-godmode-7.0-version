

# Progress Review & Next Steps

## Completed

| Phase | Item | Status |
|-------|------|--------|
| **Phase 1** | Firecrawl edge function deployed | Done |
| **Phase 1** | Unique constraint on city_prices | Done |
| **Phase 2** | MarketItemDetailSheet redesign with micronutrients, serving slider | Done |
| **Phase 3** | `user_roles` table + `has_role()` function | Done |
| **Phase 3** | Admin auth guard on `/admin/ads` | Done |
| **Phase 3** | Test ad campaigns seeded (Yoga Bar, MuscleBlaze, Amul Pro) | Done |
| **Phase 4** | Report Price FAB on MarketCategories | Done |
| **Phase 4** | SavingsTrackerCard created + wired into Market page | Done |
| **Phase 4** | MultiCityCompareSheet verified using DB data | Done |
| **Phase 5** | `pg_cron` + `pg_net` extensions enabled (migration exists) | Done |
| **Phase 5** | Cron job SQL inserted (volatile-daily, medium-biweekly, full-monthly) | Done |

## Remaining Phase 5 Items (Pre-Publish)

| Item | Description | Effort |
|------|-------------|--------|
| **Barcode scanner** | Camera-based barcode scanning → `packed_products` lookup | ~2 hrs |
| **Affiliate link tracking** | Amazon/BigBasket referral links on packed product pages | ~1 hr |
| **Government Mandi API** | Wire `fetch-govt-prices` edge function (needs data.gov.in API key) | Blocked on API key |

## Recommendation: Barcode Scanner Next

The barcode scanner is the highest-impact remaining item — it turns the packed_products table (123 rows already seeded) into a scannable, shoppable experience.

### Implementation Plan

**Step 1: Add barcode scanning library**
Install `@nicolo-ribaudo/html5-qrcode` (lightweight, works in mobile browsers, supports EAN-13/UPC barcodes).

**Step 2: Create BarcodeScanner component**
- Camera permission request with fallback messaging
- Live viewfinder with scan region overlay
- On scan: query `packed_products` table by matching product name/brand (barcode column to be added)
- Show product detail card with nutrition, PES score, price

**Step 3: Add barcode column to packed_products**
- Migration: `ALTER TABLE packed_products ADD COLUMN barcode text;`
- Add index for fast lookup
- Seed known barcodes for top products (Yoga Bar, MuscleBlaze, Amul, etc.)

**Step 4: Wire into Market page**
- Add scan button (camera icon) to Market page header
- Open BarcodeScanner as a full-screen sheet
- On successful scan → navigate to product detail or show inline result

### Files Changed
- New: `src/components/BarcodeScanner.tsx`
- Edit: `src/pages/Market.tsx` — add scan button
- Edit: `src/components/MarketPageHeader.tsx` — scan icon in header
- New migration: add `barcode` column to `packed_products`

