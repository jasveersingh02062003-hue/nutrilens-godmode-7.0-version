

# Smart Market & Monetization — Phased Implementation Plan

## Current State Summary

- **Database**: Seeded — 118 city_prices, 123 packed_products, 350 price_history rows
- **PES Formula**: Fixed in both `market-data.ts` and `market-service.ts` (normalized to per-100g)
- **MarketContext**: Already queries `city_prices` DB with fallback to static multipliers
- **Firecrawl**: API key configured, edge function deployed, but never triggered
- **Admin**: `/admin/ads` page exists but has no auth guard

---

## Phase 1: Activate Firecrawl (One-Time Scrape)
**Goal:** Run Firecrawl once now for 3 key cities to get real live prices into `city_prices`. No cron job — manual trigger only.

### Steps:
1. **Add unique constraint** on `city_prices(city, item_name, price_date)` via migration — required for the upsert in `firecrawl-prices` to work (currently it silently fails)
2. **Trigger firecrawl-prices** edge function manually for Hyderabad, Mumbai, and Delhi using `supabase.functions.invoke()` — this scrapes BigBasket/Blinkit/FreshToHome for chicken, eggs, mutton, fish, tomato, onion, potato prices
3. **Verify** the scrape worked by querying `city_prices` for today's date and confirming rows were inserted with `source = 'firecrawl'`
4. **Update freshness badge** — the `PriceFreshnessBadge` already reads `lastUpdated` timestamps, so scraped data will automatically show "Live" instead of "Estimate"

**Files changed:**
- New migration: add unique constraint
- No code changes — everything is already wired

**Firecrawl credits used:** ~3 searches (1 per city) = 3 credits

---

## Phase 2: Enrich MarketItemDetailSheet (Amazon/Flipkart Level)
**Goal:** Transform the thin detail page into a rich product page with micronutrients, serving size slider, health benefits, cooking tips, and buy CTAs.

### Steps:
1. **Extend `RawMarketItem` type** in `market-data.ts` — add optional fields:
   - `micronutrients`: `{ iron, calcium, vitB12, zinc, vitD, vitC, omega3, selenium, folate }` (all per 100g)
   - `healthBenefits`: string[] (e.g., "Rich in B12 for nerve health")
   - `cookingTips`: string[] (e.g., "Grilling retains more protein than frying")
   - `allergenTags`: string[] (for fresh items like fish, prawns)
   - `buyLinks`: `{ platform: string; url: string }[]`

2. **Populate micronutrient data** for all 350+ items in `MARKET_ITEMS` array — sourced from IFCT (Indian Food Composition Table) which we already reference in `ifct-reference.ts`

3. **Build serving size slider** in `MarketItemDetailSheet`:
   - Slider from 50g to 1000g (default 100g)
   - All nutrition values recalculate live as user moves slider
   - Price also recalculates (e.g., 200g chicken at ₹320/kg = ₹64)

4. **Redesign the detail sheet** to Amazon-style sections:
   - Hero: product image (larger), name, brand, PES badge, price
   - Nutrition Facts: full table with macros + micros, serving size selector
   - Health Benefits: bullet list with icons
   - Cooking Tips: expandable section
   - Price Trend: 7-day chart (already exists)
   - Buy Online: platform cards with prices and external links
   - Add to Meal Plan: prominent CTA button
   - Report Price / Set Alert: secondary actions

**Files changed:**
- `src/lib/market-data.ts` — extend type + add micronutrient data
- `src/components/MarketItemDetailSheet.tsx` — major redesign

---

## Phase 3: Admin Auth Guard + Ad System Activation
**Goal:** Secure the admin page and make the ad system functional with test campaigns.

### Steps:
1. **Create `user_roles` table** with `admin` role enum (following the security pattern in system instructions)
2. **Add auth guard** to `/admin/ads` — check `has_role(auth.uid(), 'admin')` before rendering
3. **Seed test ad campaigns** — create 2-3 test brand accounts + campaigns + creatives targeting protein-gap users
4. **Verify SmartProductNudge** renders on Dashboard when user has a protein gap and matching products exist

**Files changed:**
- New migration: `user_roles` table + `has_role()` function
- `src/pages/AdAdmin.tsx` — add role check
- Database inserts: test brand/campaign/creative data

---

## Phase 4: Market UX Polish
**Goal:** Fix remaining UX gaps for a production-quality market experience.

### Steps:
1. **Prominent "Report Price" CTA** on market category pages (not just buried in detail sheet)
2. **Savings Tracker** — calculate "This week you saved ₹X by choosing PES-optimized foods"
3. **Multi-city comparison** — wire `MultiCityCompareSheet` to use real `city_prices` data instead of static multipliers
4. **Market page performance** — add virtualization for 350+ items list

**Files changed:**
- `src/pages/MarketCategories.tsx` — report price button
- New component: `SavingsTrackerCard.tsx`
- `src/components/MultiCityCompareSheet.tsx` — use DB data
- Market list components — add virtualization

---

## Phase 5: Future (Pre-Publish)
These will be done when you're ready to publish:

1. **Re-run Firecrawl** for all 10 cities to refresh prices
2. **Set up pg_cron** for automated daily scraping (Category A items)
3. **Government Mandi API** — register at data.gov.in, configure API key, wire `fetch-govt-prices`
4. **Barcode scanner** for packed products
5. **Affiliate link tracking** for Amazon/BigBasket

---

## Execution Order

```text
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
(30 min)   (3 hrs)   (1 hr)    (2 hrs)   (pre-publish)
```

We start with Phase 1 (Firecrawl activation) since it's quick, uses minimal credits (3 only), and immediately makes the app show real data.

