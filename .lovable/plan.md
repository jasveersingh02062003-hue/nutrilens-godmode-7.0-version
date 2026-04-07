

# Phase 10: Smart Market — Missing Categories, IP Fallback, Fresh/Packed Tabs, Visual Polish

## Current State Assessment

The Market page has a solid foundation: auto-location via GPS+OWM, 85 real market items, 2-tier categories, hero section, smart sections, compare, and price trends. However, the user report identifies these critical gaps:

## Gaps to Fix

| # | Gap | Current | Fix |
|---|-----|---------|-----|
| 1 | **No IP fallback** for location | Only GPS + OWM; if denied, falls back to "India" | Add IP geolocation (ipapi.co) as Layer 2 before default |
| 2 | **Missing: Dry Fruits category** | Not in `MARKET_ITEMS` or `TOP_CATEGORIES` | Add top-level "Dry Fruits & Seeds" with ~12 items (Almonds, Cashews, Walnuts, Pistachios, Dates, Figs, Raisins, Pumpkin Seeds, Flax Seeds, Sunflower Seeds, Chia Seeds, Melon Seeds) |
| 3 | **Missing: Supernatural/Superfoods category** | Not in data | Add top-level "Superfoods" with ~8 items (Spirulina, Ashwagandha, Moringa, Wheatgrass, Amla, Shatavari, Triphala, Turmeric powder) |
| 4 | **No Fresh vs Packed top-level split** | All items in flat list; user report wants Amazon-like tabs | Add a "Fresh / Packed" toggle at the very top, above categories |
| 5 | **Peas, Lady Finger, Bitter Gourd missing** from vegetables | Common Indian veggies absent | Add ~6 more everyday vegetables |
| 6 | **No social proof / scarcity badges** | Cards are clean but lack engagement hooks | Add "Popular in {city}" badge on top 3 items; "Best Seller" tag |
| 7 | **Supplements category empty** in subcategories | `supplements: []` in SUBCATEGORIES | Add subcategories: Protein Powders, Vitamins, Health Supplements |
| 8 | **No supplement items** in MARKET_ITEMS | Zero supplement entries | Add ~8 items (MuscleBlaze Whey, AS-IT-IS Raw Whey, MyProtein, OZiva Plant, Fish Oil, Multivitamin, Vitamin D3, Creatine) |
| 9 | **Packed food items missing** from MARKET_ITEMS | Zero packed food entries | Add ~15 packed items (Amul Protein Buttermilk, Yoga Bar, RiteBite, MyFitness PB, Saffola Oats, MTR RTE, etc.) |

## Plan — 5 Steps

### Step 1: Add IP Geolocation Fallback to auto-location.ts
Modify `detectCity()` in `src/lib/auto-location.ts`:
- After GPS fails, before returning "India" fallback, try `fetch('https://ipapi.co/json/')` to get city from IP
- Map result through `resolveCity()` same as GPS
- Cache the IP result the same way
- This is ~15 lines of additional code in the existing fallback path

### Step 2: Add Missing Categories + Items to market-data.ts
Expand `MarketTopCategory` type to include `'dry_fruits'` and `'superfoods'`.
Expand `MarketSubcategory` to include `'nuts'`, `'seeds'`, `'dried_fruits'`, `'adaptogens'`, `'green_powders'`, `'protein_powders'`, `'vitamins'`, `'protein_drinks_packed'`, `'protein_bars_packed'`, `'ready_to_eat_packed'`, `'snacks_packed'`.

Add to `TOP_CATEGORIES`:
- `{ key: 'dry_fruits', label: 'Dry Fruits & Seeds', emoji: '🌰', color: 'from-amber-600/15 to-amber-600/5' }`
- `{ key: 'superfoods', label: 'Superfoods', emoji: '🌿', color: 'from-emerald-500/15 to-emerald-500/5' }`

Add to `SUBCATEGORIES`:
- `dry_fruits`: Nuts, Seeds, Dried Fruits
- `superfoods`: Adaptogens, Green Powders
- `supplements`: Protein Powders, Vitamins, Health Supplements
- `packed_foods`: keep existing + ensure all subcategories populated

Add to `MARKET_ITEMS` (~35 new items):
- **Dry Fruits:** Almonds ₹700/kg, Cashews ₹900/kg, Walnuts ₹1200/kg, Pistachios ₹1500/kg, Dates ₹300/kg, Figs ₹800/kg, Raisins ₹250/kg, Pumpkin Seeds ₹600/kg, Flax Seeds ₹200/kg, Sunflower Seeds ₹300/kg, Chia Seeds ₹500/kg, Melon Seeds ₹400/kg
- **Superfoods:** Spirulina ₹450/100g, Ashwagandha ₹300/100g, Moringa ₹250/100g, Wheatgrass ₹350/100g, Amla Powder ₹200/100g, Turmeric Powder ₹150/kg, Shatavari ₹400/100g, Triphala ₹250/100g
- **Supplements:** MuscleBlaze Whey ₹2200/kg, AS-IT-IS Raw Whey ₹1400/kg, OZiva Plant Protein ₹1800/kg, MyProtein Whey ₹3000/kg, Fish Oil ₹400/60caps, Multivitamin ₹350/60tabs, Vitamin D3 ₹300/60caps, Creatine ₹800/250g
- **Packed Foods:** Amul Protein Buttermilk ₹30/200ml, Amul Protein Lassi ₹45/200ml, Yoga Bar Protein Bar ₹170/bar, RiteBite Max Protein ₹150/bar, MyFitness Peanut Butter ₹450/510g, Too Yumm Protein Chips ₹40/30g, Saffola Oats ₹120/500g
- **Missing Vegetables:** Peas ₹60/kg, Lady Finger (Bhindi) ₹40/kg, Bitter Gourd ₹50/kg, Ridge Gourd ₹35/kg, Bottle Gourd ₹30/kg, Pumpkin ₹25/kg

### Step 3: Add Fresh vs Packed Toggle to Market.tsx
At the top of the main content (below search, above category grid), add a segmented toggle:
```
[🥬 Fresh Foods]  [📦 Packed & Branded]
```
- "Fresh" shows categories: Meat, Eggs, Vegetables, Dals, Dairy, Grains, Fruits, Dry Fruits, Superfoods
- "Packed" shows categories: Packed Foods, Supplements
- This is a simple state variable `viewMode: 'fresh' | 'packed'` that filters which TOP_CATEGORIES to show in the grid
- Default to "Fresh"

### Step 4: Add Social Proof & Engagement Badges to MarketItemCard
Add optional props to `MarketItemCard`:
- `badge?: 'popular' | 'best_seller' | 'new'` — shown as a small colored pill on the card
- In Market.tsx, assign badges: top 3 by PES get "Popular in {city}", items with `best_value` tag get "Best Seller"
- Minimal visual change — just a small colored tag inside the card

### Step 5: Populate Supplement Subcategories
Update `SUBCATEGORIES.supplements` from `[]` to proper subcategories, and ensure `SUBCATEGORIES.packed_foods` aligns with the new packed items.

## Files Changed

| File | Action |
|------|--------|
| `src/lib/auto-location.ts` | Modified — add IP geolocation fallback (ipapi.co) |
| `src/lib/market-data.ts` | Modified — add dry_fruits, superfoods categories; add ~35 new items; add packed foods and supplements; fix supplements subcategories |
| `src/pages/Market.tsx` | Modified — add Fresh/Packed toggle, badge assignment logic |
| `src/components/MarketItemCard.tsx` | Modified — add optional badge prop |
| `src/components/MarketCategoryGrid.tsx` | Modified — accept filtered categories based on viewMode |

## Technical Notes
- IP fallback uses free ipapi.co (no key needed, 1000 req/day free tier — more than sufficient)
- All new items use real researched Indian market prices (2025-2026)
- Packed items have `isVeg: true/false` and proper nutrition per serving
- No API/Firecrawl calls — all static data with FIRECRAWL_HOOK comments preserved
- Category grid will show 9 categories for Fresh view, 2 for Packed view — clean separation

