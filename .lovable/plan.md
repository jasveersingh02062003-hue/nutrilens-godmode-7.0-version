

# Phase 7: Smart Market — Monika Integration + Multi-City View + Govt API Placeholder + Budget Planner Sync

## Gap Audit (Blueprint vs Current)

| # | Blueprint Requirement | Status | Action |
|---|----------------------|--------|--------|
| 1 | **Monika Chat answers "What's cheapest protein today?"** (Section 6.3) | Missing — `buildMonikaContext()` has no market/PES data | Add top PES items + city prices to Monika context |
| 2 | **Multi-city price comparison** (Section 7.4, Week 8) | Missing — only single city view | Add multi-city comparison sheet (select 2 cities, see price diff) |
| 3 | **Govt Mandi API placeholder** (Phase 1 roadmap, Section 2.1 Tier 1) | Missing — no edge function or hook | Create placeholder edge function + GOVT_API_HOOK comments |
| 4 | **Budget Planner uses live prices** (Section 6.3) | Partial — BudgetPlannerTab uses static costs | Wire `estimateLiveCost` into BudgetPlannerTab calculations |
| 5 | **Dashboard banner rotation logic** (Section 5.1A) | SmartMarketBanner exists but no rotation with plan banner | Add rotation logic: 70/30 plan/market when plan active, 80/20 market/tips otherwise |
| 6 | **"Protein budget optimizer"** (Section 5.3 — "Best protein under ₹200/day") | Budget filter exists but no "optimizer" summary card | Already done via `budgetProteinSummary` — just needs better visibility |
| 7 | **Toor Dal, Masoor Dal missing from Dals category filter** | Partial — filter checks `n.includes('dal')` but some items named differently | Already works — F05-F09 have "Dal" in name |
| 8 | **Supplements vs food cost comparison** (Section 6.3) | Missing | Defer — P3 feature |
| 9 | **Export price reports** (Section 7.4 Premium) | Missing | Defer — P3 premium feature |
| 10 | **National average fallback when city not set** (Section 2.4) | Shows "Static prices" label but no "Average across India" label | Add label when no city set |

## Plan — 5 Steps

### Step 1: Add Market Intelligence to Monika Context
In `src/lib/monika-actions.ts` `buildMonikaContext()`, add a `marketIntelligence` block:
- Import `foodDatabase` from `pes-engine.ts`
- Get top 5 PES-ranked foods sorted by `proteinPerRupee`
- Include user's city from profile
- Add to context: `{ city, topProteinValues: [{name, price, protein, pesPerRupee}], tip: "Eggs are best value today" }`
- This lets Monika answer "what's cheapest protein?" without any API call

### Step 2: Multi-City Price Comparison Sheet
Create `src/components/MultiCityCompareSheet.tsx`:
- Select 2 cities from SUPPORTED_CITIES
- Query `city_prices` for both cities for volatile items (Chicken, Eggs, Paneer, Tomato, Onion)
- Display side-by-side with price difference and % cheaper indicators
- Add "Compare Cities" button on Market page header (next to city picker)

### Step 3: Govt Mandi API Placeholder Edge Function
Create `supabase/functions/fetch-govt-prices/index.ts`:
- Placeholder that returns mock wholesale prices
- Comments: `// GOVT_API_HOOK: Replace with data.gov.in agmarknet API`
- Structure ready for: wholesale price fetch → retail markup → upsert to city_prices
- Include the retail markup constants (Chicken ×1.3, Vegetables ×1.5, Fish ×1.4)

### Step 4: Dashboard Banner Rotation Logic
Update `src/components/dashboard/PlanBannerSection.tsx` (or wherever banner renders):
- If active plan exists: 70% chance show plan banner, 30% SmartMarketBanner
- If no active plan: show SmartMarketBanner always
- If any price drop >10% in user's city: always show market banner that day
- Use day-of-year seeded randomness (consistent within a day)

### Step 5: "Average across India" Label for No-City Users
In `Market.tsx`, when no city is set:
- Change header subtitle from "Static prices" to "Average across India"
- Show a more prominent prompt to set city for better accuracy

## Files Changed

| File | Action |
|------|--------|
| `src/lib/monika-actions.ts` | Modified — add marketIntelligence to context |
| `src/components/MultiCityCompareSheet.tsx` | New — side-by-side city price comparison |
| `src/pages/Market.tsx` | Modified — Compare Cities button, "Average across India" label |
| `supabase/functions/fetch-govt-prices/index.ts` | New — placeholder with GOVT_API_HOOK |
| `src/components/dashboard/PlanBannerSection.tsx` | Modified — rotation logic |
| `src/components/SmartMarketBanner.tsx` | Modified — accept priceDropDetected prop |

## Technical Notes
- No API keys needed — Govt API is placeholder only
- Multi-city comparison queries existing `city_prices` table (will show empty for cities without data, with a "No data yet" message)
- Monika context addition is ~20 lines — lightweight, no async calls needed (uses static foodDatabase)
- Banner rotation uses `dayOfYear % 100 < threshold` for deterministic daily behavior

