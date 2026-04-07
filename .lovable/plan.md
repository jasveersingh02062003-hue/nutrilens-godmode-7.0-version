

# Phase 4: Smart Market — Packed Foods Expansion + Scanner Integration + Category Depth

## Remaining Gaps vs Blueprint

### What's Done (Phases 1-3)
- Market page with categories, search, sort, city picker, hero card, savings tracker, budget filter
- Compare selection + ComparisonSheet integration
- Detail sheet with nutrition, platforms, trend chart
- Report Price crowdsource
- Swap nudges in TodayMealPlan
- Shopping list cost estimates in Kitchen tab
- City alias mapping (resolveCity)
- Dashboard sidebar + profile links
- SmartMarketBanner rotating on dashboard
- FIRECRAWL_HOOK placeholders throughout

### Remaining Gaps (This Phase)

| Gap | Blueprint Section | Status |
|-----|------------------|--------|
| **Scanner doesn't show PES + price after scan** | Section 6.2 | Missing |
| **Packed products catalog too small (~35 items)** | Section 3.3 requires 100+ | Partial |
| **Missing categories: Frozen, Beverages, Spreads** | Section 4.1 category tree | Missing pills |
| **No "Buy" CTA buttons on market cards** | Section 5.3 "[Buy]" button | Missing |
| **Detail sheet missing allergen warnings display** | Section 3.2 "Allergens" | Partial |
| **No "Add to Plan" on market card list (only in detail)** | Section 5.3 "[Add to Plan]" | Missing from cards |
| **Quick Log doesn't show PES after logging** | Section 6.3 "you spent ₹X, PES: Y" | Missing |
| **Missing vegetables & fruits in static food data** | Section 4.1 Everyday Vegetables | Sparse |

## Plan — 6 Steps

### Step 1: PES + Price After Food Scan (LogFood.tsx + CameraHome.tsx)
After `analyze-food` returns food items, enrich each with:
- Call `getLivePrice()` for each identified food to get city price
- Calculate PES using `calculatePES()` from pes-engine
- Show a summary card below scan results: "💰 ₹{cost} ({city}) · ⭐ PES {score}/10 · ₹{costPerGram}/g protein"
- Non-blocking: if price lookup fails, skip price display gracefully

### Step 2: Expand Packed Products Catalog (DB migration)
Seed 50+ additional packed products via migration covering:
- **Frozen foods**: Licious Chicken Breast, FreshToHome Fish, ITC Momos, McCain items
- **Spreads**: MyFitness Peanut Butter, Sundrop, Pintola Almond Butter
- **Beverages**: Coconut water brands, Green Tea, ACV
- **Protein Ice Cream**: Get-A-Whey, HydroFit
- **More RTE**: Saffola Oats, MTR Upma, Haldiram items
- All with real nutrition data, image URLs, PES scores, platform links

### Step 3: Add Missing Category Pills (Market.tsx)
Add category pills for: 🧊 Frozen, 🍹 Drinks, 🥜 Spreads
Wire them to filter packed_products by their respective categories.
Update `MarketCategory` type and `getMarketItems` to handle new categories.

### Step 4: "Buy" CTA + "Add to Plan" on Market Cards
- Add a small shopping cart icon on each card with platform links (opens external URL)
- Add "+" button on cards for quick "Add to Plan" (shows toast + navigates to planner)
- For packed items with platform links, "Buy" opens the cheapest platform URL
- For fresh items without links, show "Available at local stores"

### Step 5: Quick Log PES Summary
After user logs a meal via QuickLog or LogFood, show a brief PES insight toast:
- "🍗 Chicken Salad · ₹43 · PES 8.5 — Excellent value!"
- Uses `calculatePES()` on the logged meal's cost and protein

### Step 6: Enrich Detail Sheet Allergens
In `MarketItemDetailSheet.tsx`, show allergen tags from the item's allergens array with color-coded badges (red for severe like Gluten/Lactose, yellow for mild).

## Files Changed

| File | Action |
|------|--------|
| `src/pages/LogFood.tsx` | Modified — add PES + price card after scan results |
| `src/pages/CameraHome.tsx` | Modified — same PES enrichment for camera scan |
| `src/pages/Market.tsx` | Modified — add Frozen/Drinks/Spreads pills, Buy/Add buttons on cards |
| `src/lib/market-service.ts` | Modified — add new category filters for frozen/drinks/spreads |
| `src/components/MarketItemDetailSheet.tsx` | Modified — allergen badge display |
| DB: `packed_products` | Data insert — 50+ new products |

## Technical Notes
- PES enrichment after scan is async and non-blocking — UI shows food items immediately, PES card appears once price lookup completes
- "Buy" links use `window.open()` with platform URLs from packed_products.platforms array
- No Firecrawl or API calls — all static/DB data with FIRECRAWL_HOOK placeholders maintained

