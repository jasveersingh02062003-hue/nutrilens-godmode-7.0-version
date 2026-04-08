

# Actual Gaps — Corrected Audit + Implementation Plan

Your audit report is **outdated on many points**. Here's the reality based on live database queries:

## Already Done (Audit Says Missing, But Actually Complete)

| Audit Claim | Reality |
|---|---|
| packed_products = 0 rows | **123 rows** in DB |
| city_prices = 0 rows | **131 rows** (9 cities, 31 items) |
| price_history = 0 rows | **350 rows** |
| No unique constraint on city_prices | **Exists**: `city_prices_city_item_date_unique` |
| No pg_cron jobs | **4 jobs active**: volatile-daily, medium-biweekly, full-monthly, price-alerts-hourly |
| PES formula mismatch | **Fixed** in market-service.ts line 271-272 (normalizes to per-100g) |
| No admin auth guard | **Built** — AdAdmin.tsx uses `has_role()` RPC check (lines 110-117) |
| No barcode scanner | **Built** — BarcodeScanner.tsx exists, wired to MarketPageHeader |
| No affiliate links | **Built** — 10 products have barcodes + affiliate data, MarketItemDetailSheet has "Buy Online" section |
| No micronutrients | **Built** — MarketItemDetailSheet has full micronutrient table (Iron, Calcium, B12, Zinc, etc.) |
| No serving size selector | **Built** — Slider for 50g-1000g with live recalculation |
| No savings tracker | **SavingsTrackerCard** exists and is wired to Market page |
| No "Report a Price" CTA | **Report Price FAB** on MarketCategories |
| No multi-city comparison | **MultiCityCompareSheet** wired with DB data |

---

## Actual Remaining Gaps (7 items)

### P0 — Critical (3 items)

**1. Government Mandi API is still a placeholder**
- `fetch-govt-prices` returns empty array
- Blocked on your data.gov.in API key registration
- Effort: 1 hr (once you provide the key)

**2. 113 packed_products have no barcode or affiliate links**
- Only 10/123 products have barcodes seeded
- Barcode scanner won't find most products
- Effort: 1 hr — seed barcodes for top 50 products

**3. No user_roles seeded — admin page inaccessible**
- `user_roles` table has 0 rows
- Nobody can actually access /admin/ads
- Effort: 5 min — insert your user ID as admin

### P1 — Important (2 items)

**4. No push notification delivery for price alerts**
- `check-price-alerts` cron runs hourly but only checks thresholds
- No actual notification delivery (no FCM/Web Push configured)
- Effort: 3 hrs

**5. Market page has no pagination/virtualization**
- 350+ fresh items + 123 packed = ~470 items loading at once
- Will cause performance issues on low-end phones
- Effort: 2 hrs

### P2 — Nice to Have (2 items)

**6. No wearable integration (Google Fit)**
- `GoogleFitSheet` component exists but is not connected
- Effort: 4 hrs

**7. No restaurant menu integration (Swiggy/Zomato)**
- Competitive gap vs HealthifyMe
- Effort: 5 hrs

---

## Implementation Plan

### Step 1: Seed admin role (5 min)
Insert your user ID into `user_roles` with `admin` role so you can access /admin/ads.

### Step 2: Seed remaining barcodes (1 hr)
Add real EAN-13 barcodes for top 50 packed products (protein bars, drinks, supplements) so the barcode scanner has meaningful coverage.

### Step 3: Market page virtualization (2 hrs)
Add `react-window` or intersection-observer-based lazy loading to prevent 470+ items rendering at once.

### Step 4: Wire Government API (1 hr, blocked on your API key)
Complete `fetchMandiPrices()` with real data.gov.in API call, mandi-to-city mapping, and retail markup application.

### Step 5: Push notifications for price alerts (3 hrs)
Implement Web Push API with service worker for price alert delivery.

### Steps 6-7: Wearable + restaurant integrations (9 hrs total)
Future sprint items.

---

**Bottom line: Your system is at ~75% health, not 30%. The architecture AND data are live. The main gaps are: more barcode coverage, admin role seeding, and the govt API key from you.**

