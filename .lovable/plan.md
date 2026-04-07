

# Phase 3: Smart Market — Cross-Feature Sync & Smart Features

## Gap Analysis (Blueprint vs Current)

### Already Done (Phase 1 + 2 + 2.5)
- Database tables: `price_history`, `packed_products`, `city_prices`, `price_reports`
- Market page with categories, search, sort, city picker, hero card
- Detail sheet with nutrition, platforms, trend chart, allergens
- Report Price sheet (crowdsource)
- Dashboard sidebar with Smart Market entry
- Profile page Smart Market link
- Meal Planner "Market" tab with compact view
- SmartMarketBanner on dashboard (rotating)
- PriceTrendChart component (Recharts)
- City picker updates profile in DB

### Remaining Gaps (What This Phase Fixes)

| Gap | Blueprint Section | Priority |
|-----|------------------|----------|
| **No savings tracker** on Market page | Section 5.3 "YOUR SAVINGS" | P1 |
| **No inline swap nudges** in meal planner | Section 5.2 "Inline Swap Nudges" | P1 |
| **Food scanner doesn't show PES + price** after scan | Section 6.2 "Scan/Log → Price + PES" | P1 |
| **No "Compare" button on market cards** | Section 5.3 food cards show [Compare] | P1 |
| **Shopping list no live cost estimate** | Section 6.3 "Show estimated cost using live prices" | P2 |
| **No multi-city comparison** | Section 7.4 premium feature | P3 (skip for now) |
| **No price alerts** | Section 7.4 premium feature | P3 (skip for now) |
| **No affiliate/sponsored** infrastructure | Section 7.2-7.3 | P3 (skip for now) |

## Plan — 7 Steps

### Step 1: Savings Tracker on Market Page
Add a "Your Savings" section below price trends on `/market`:
- Static placeholder showing "This week: ₹0 saved" with a progress bar
- Reads from localStorage `nutrilens_market_savings` (later wired to real swap tracking)
- Shows "Start using Smart Market swap suggestions to track savings"

### Step 2: Inline Swap Nudges in Meal Planner
New component `SwapNudgeCard.tsx`:
- Shows on `TodayMealPlan` or `MealPlanDashboard` when a planned meal item has a cheaper alternative with equal/better protein
- Logic: For each planned food, check `market-service.ts` for items in same category with lower `costPerGramProtein` and similar protein
- UI: "Smarter swap: Egg Bhurji (₹35, 24g protein) vs Paneer Bhurji (₹105, 22g). Save ₹70 + 2g more protein. [Swap] [Keep]"
- Tapping "Swap" shows toast and records savings to localStorage

### Step 3: PES + Price After Food Scan
Modify the food scan result display to show PES score and city price:
- In the scan result card (after `analyze-food` returns), look up `getLivePrice()` for each identified food item
- Show: "₹{cost} ({city} price) · PES {score}/10"
- Add "📊 Ranking: #{rank} best protein meal today" line
- Non-blocking: if price lookup fails, just skip the price display

### Step 4: Compare Button on Market Cards
Add a "Compare" action to market food cards:
- Each card gets a small compare checkbox/icon
- When 2+ items selected, show a floating "Compare X items" button
- Tapping opens existing `ComparisonSheet` with selected items mapped to `CompareItem` format
- Clear selection after comparison closes

### Step 5: Shopping List Cost Estimate
In the existing grocery/shopping list (Kitchen tab), add a cost summary:
- Call `estimateLiveCost()` from `live-price-service.ts` on the generated shopping list
- Show total estimated cost at top: "Estimated cost: ₹{total} ({city} prices)"
- Each item shows individual cost if available

### Step 6: Nearest City Mapping
Add city alias logic to `market-service.ts`:
- Map: Secunderabad→Hyderabad, Noida/Gurgaon→Delhi, Thane/Navi Mumbai→Mumbai, Whitefield→Bangalore
- When user types or selects a non-supported city, auto-map and show "Showing prices for {mapped city} (nearest)"

### Step 7: Budget Optimizer Nudge
Add a "Best protein under ₹{budget}" quick filter on Market page:
- Small input field or preset buttons (₹100, ₹200, ₹300/day)
- Filters items to show combinations that maximize protein within budget
- Simple: just filter items by price ascending and show "You can get {X}g protein for ₹{budget}"

## Files Changed

| File | Action |
|------|--------|
| `src/pages/Market.tsx` | Modified — add savings tracker, compare selection, budget filter |
| `src/components/SwapNudgeCard.tsx` | New — inline swap suggestion for meal planner |
| `src/components/MarketCompareBar.tsx` | New — floating compare bar when items selected |
| `src/pages/Dashboard.tsx` or scan result component | Modified — show PES + price after scan |
| `src/components/MealPlannerTabs.tsx` | Modified — add cost estimate to kitchen/grocery tab |
| `src/lib/market-service.ts` | Modified — add city alias mapping, swap suggestion logic |

