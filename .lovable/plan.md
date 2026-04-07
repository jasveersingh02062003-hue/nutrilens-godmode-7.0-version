

# Phase 5: Smart Market — Scanner PES Display + Vegetables Expansion + Weekly Report Integration

## Current State Summary

**Completed (Phases 1-4):**
- 73 packed products across 8 categories (frozen, RTE, protein_drink, supplement, snack, beverage, spread, protein_bar)
- Market page: categories (12 pills including Frozen/Drinks/Spreads), search, sort, city picker, hero card, savings tracker, budget filter, compare selection, Buy/Add buttons on cards
- Detail sheet: nutrition grid, platform links, price trend chart, color-coded allergen badges
- Swap nudges in TodayMealPlan (SwapNudgeCard)
- Shopping list cost estimates via estimateLiveCost
- City alias mapping (resolveCity)
- PES insight toast after meal log in LogFood.tsx (line 259-267)
- 45 city_prices rows, 280 price_history rows for 3 cities
- Dashboard sidebar + profile Smart Market links
- SmartMarketBanner on dashboard
- Compare bar (MarketCompareBar) + ComparisonSheet integration

## Remaining Gaps

| Gap | Blueprint Section | Priority |
|-----|------------------|----------|
| **Scanner (CameraHome) has NO PES/price display after scan** | 6.2 "Scan → show PES + price" | P1 |
| **LogFood scan result cards don't show price/PES inline** (only toast on commit) | 6.2 visual card | P1 |
| **No vegetables/fruits in market data** (static DB has some but sparse) | 4.1 Everyday Vegetables | P1 |
| **Weekly Report doesn't include savings** | 6.3 "₹X saved this week" | P2 |
| **Monika Chat has no market data** | 6.3 "What's cheapest protein?" | P3 (skip) |
| **No price alerts** | 7.4 Premium | P3 (skip) |
| **No multi-city comparison view** | 7.4 Premium | P3 (skip) |

## Plan — 4 Steps

### Step 1: PES + Price Card in CameraHome Scan Results
After `analyze-food` returns items in the CameraHome confirm step, add a small summary card below the scanned items:
- For each identified food, call `getLivePrice()` async (non-blocking)
- Show a compact bar: "💰 ₹{totalCost} ({city}) · PES {score} — {label} · ₹{costPerGram}/g protein"
- If price lookup fails or no city set, gracefully skip

### Step 2: Inline PES Badge on LogFood Adjust Step
In LogFood.tsx adjust step (where items are listed with quantity controls), add a small PES/price indicator below each item's nutrition line:
- After items are selected, async-fetch `getLivePrice()` for each
- Display: "₹{price} · PES {value}" in a subtle muted line below the calories line
- Non-blocking: if lookup fails, just don't show it

### Step 3: Expand Vegetables & Fruits in Static Market Data
Add more fresh food items to the `pes-engine.ts` foodDatabase covering:
- Everyday vegetables: Tomato, Onion, Potato, Ginger, Garlic, Green Chilli, Coriander, Beetroot, Sweet Potato, Drumstick, Methi
- Fruits: Banana, Apple, Papaya, Guava, Orange, Mango (seasonal)
- Ensure they appear under 'vegetable' and 'fruits' category filters in market-service

### Step 4: Add Savings Line to Weekly Report
In `WeeklyReportCard.tsx` or `weekly-feedback.ts`, read `nutrilens_market_savings` from localStorage and include a "Smart Market savings" line: "₹{weekly} saved through smart swaps this week"

## Files Changed

| File | Action |
|------|--------|
| `src/pages/CameraHome.tsx` | Modified — add PES+price summary card after scan |
| `src/pages/LogFood.tsx` | Modified — add inline PES/price below items in adjust step |
| `src/lib/pes-engine.ts` | Modified — add vegetables & fruits to foodDatabase |
| `src/lib/market-service.ts` | Modified — improve vegetable/fruit category filtering |
| `src/components/WeeklyReportCard.tsx` | Modified — add savings line |

## Technical Notes
- All price lookups are async and non-blocking via `getLivePrice()` from `live-price-service.ts`
- No Firecrawl/API calls — FIRECRAWL_HOOK comments preserved for future integration
- PES calculation uses existing `calculatePES()` from `pes-engine.ts`
- Vegetables have low protein so PES will be low — that's correct behavior; they rank by nutrition density instead

