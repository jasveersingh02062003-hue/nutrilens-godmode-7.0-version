

# Phase 9: Smart Market — Complete UI/UX Overhaul + Real Pricing + Auto-Location

## Problems Identified

1. **No auto-location** — City must be manually selected; weather service already has geolocation but Market page doesn't use it
2. **Flat, static feel** — All items look the same; no visual hierarchy, no real marketplace feeling
3. **Weak categories** — Current pills are too generic ("Protein", "Veggies"); no sub-categories for meat cuts, fish types, egg varieties
4. **No real market prices** — Items show `foodDatabase` computed prices (e.g., Egg ₹6, Chicken ₹48/100g) instead of actual Indian market rates per kg
5. **Confusing item list** — Cooked dishes (Biryani, Pizza, Samosa) mixed with raw ingredients; users can't tell what's a grocery item vs a restaurant food
6. **No visual appeal** — Emoji-only images, no gradient cards, no category banners, no featured sections like Amazon/BigBasket
7. **Missing sub-categories** — No "Chicken parts" (breast, thigh, leg), no "Fish types" (Rohu, Pomfret, Surmai, Hilsa), no "Egg types" (white, brown, desi), no "Mutton cuts" (leg, keema, ribs)

## Plan — 7 Steps

### Step 1: Auto-Location Detection
- Use the existing `getUserLocation()` from `weather-service.ts` to auto-detect city on Market page load
- Reverse geocode lat/lon to city name using OpenWeatherMap (already has API key)
- Map detected city to nearest SUPPORTED_CITY using `resolveCity()`
- Auto-save to profile if not set; show "📍 Detected: Hyderabad" banner
- User can still override manually
- Update `Market.tsx` useEffect to call geolocation on mount when `!city`

### Step 2: Restructure Categories with Sub-Categories
Replace flat category pills with a two-tier system:

**Top-level tabs** (horizontal scroll):
- 🥩 Meat & Seafood
- 🥚 Eggs
- 🥬 Vegetables
- 🫘 Dals & Pulses
- 🥛 Dairy
- 🌾 Grains & Millets
- 🍌 Fruits
- 📦 Packed Foods
- 💊 Supplements

**Sub-categories (shown when parent selected):**
- Meat & Seafood → Chicken (Whole, Breast, Thigh, Leg, Keema), Fish (Rohu, Pomfret, Surmai, Hilsa, Katla, Bangda), Mutton (Leg, Keema, Ribs, Liver), Prawns (Small, Medium, Jumbo)
- Eggs → White Egg, Brown Egg, Desi/Country Egg
- Packed Foods → Protein Drinks, Protein Bars, Ready to Eat, Ready to Cook, Snacks, Frozen, Spreads, Ice Cream
- Vegetables → Leafy Greens, Root Vegetables, Everyday, Exotic

### Step 3: Replace Food Database with Real Market Items
Separate "raw market ingredients" from "cooked dishes" in `pes-engine.ts`:
- Create a new `MARKET_ITEMS` array in `market-service.ts` with real Indian market prices per standard unit (kg/dozen/liter)
- Include: Chicken Breast ₹320/kg, Chicken Whole ₹220/kg, Eggs (White) ₹6/piece, Eggs (Brown) ₹8/piece, Eggs (Desi) ₹12/piece, Rohu ₹220/kg, Pomfret ₹600/kg, Surmai ₹500/kg, Hilsa ₹800/kg, Mutton Leg ₹750/kg, Mutton Keema ₹700/kg, Prawns Medium ₹500/kg, Prawns Jumbo ₹800/kg
- Include all vegetables with real per-kg prices
- Include all dals, dairy, grains with real per-kg prices
- Keep existing `foodDatabase` for PES calculations on cooked dishes (scanner/planner)
- Market page shows ONLY raw ingredients and packed products — no cooked dishes

### Step 4: Visual Overhaul — Marketplace-Quality UI
Redesign the Market page with Amazon/BigBasket-inspired sections:

**A) Hero Section** — Gradient banner with today's best deal + price drop alert
**B) Category Grid** — 3x3 or 2-row grid with icon+label cards (like BigBasket home), not just pills
**C) Featured Section** — "Today's Best Value", "Price Drops This Week", "Budget Picks under ₹100"
**D) Item Cards** — Larger cards with:
  - Gradient background based on PES color (green/yellow/red)
  - Prominent price with unit (₹220/kg)
  - Price change badge (↓12% in green or ↑5% in red)
  - Protein per ₹ value
  - "Add to Plan" and "Compare" quick actions
  - Freshness indicator dot
**E) Section Headers** — "🥩 Meat & Seafood", "🥚 Eggs", etc. with count badges

### Step 5: Smart Sections (Human Psychology)
Add engagement-driving sections inspired by e-commerce best practices:

1. **"Best Value Right Now"** — Top 3 items by PES, large hero cards
2. **"Price Drops This Week"** — Items with negative priceChange, urgency messaging ("Buy before price goes up!")
3. **"Budget Hero Picks"** — Best protein under ₹50, ₹100, ₹200
4. **"Compare & Save"** — Side-by-side: "Paneer vs Soya Chunks — Save ₹270/kg, get 2x protein"
5. **"Seasonal Picks"** — Based on current month/season
6. **"New to Market"** — Recently added items
7. **"Your City's Favorites"** — Popular items in user's city

### Step 6: Improve Search & Filtering
- Add voice search button (using Web Speech API)
- Search auto-suggestions as user types
- Filter chips: Veg Only, Non-Veg, Under ₹100, High Protein (>20g)
- Sort by: Best Value (PES), Lowest Price, Highest Protein, Price Drop

### Step 7: Real Market Prices Data Entry
Populate `MARKET_ITEMS` with researched, accurate Indian market prices (2025-2026):
- Chicken prices by city (Hyd: ₹200/kg, Mumbai: ₹260/kg, Delhi: ₹240/kg)
- Fish prices by type and city
- Vegetable prices (national averages with city multipliers)
- All data sourced from mandi.gov.in averages + retail markup
- Leave `// FIRECRAWL_HOOK` for future live price replacement

## Files Changed

| File | Action |
|------|--------|
| `src/pages/Market.tsx` | Major rewrite — auto-location, 2-tier categories, marketplace UI, smart sections |
| `src/lib/market-service.ts` | Major rewrite — new MARKET_ITEMS array with real prices, sub-category system, remove cooked dishes from market |
| `src/components/MarketCategoryGrid.tsx` | New — visual category grid component (BigBasket-style) |
| `src/components/MarketHeroSection.tsx` | New — hero banner with best deal + price drop |
| `src/components/MarketSmartSections.tsx` | New — "Price Drops", "Budget Picks", "Compare & Save" sections |
| `src/components/MarketItemCard.tsx` | New — redesigned item card with gradient, prominent pricing |
| `src/lib/auto-location.ts` | New — geolocation → city resolution, reverse geocode using OWM |
| `src/components/MarketItemDetailSheet.tsx` | Modified — updated to show sub-category info, meat cuts, fish types |
| `src/components/MarketCompactView.tsx` | Modified — use new MARKET_ITEMS data |
| `src/components/SmartMarketBanner.tsx` | Modified — use real prices from MARKET_ITEMS |

## Technical Notes
- Auto-location uses existing OWM API key from `weather-service.ts` — no new secrets needed
- `MARKET_ITEMS` is a static array with ~150 real market items (not cooked dishes)
- Cooked dishes stay in `foodDatabase` for scanner/planner PES calculations
- Sub-categories use a `subcategory` field on each MarketItem
- City-specific price multipliers: `{ hyderabad: 0.95, mumbai: 1.15, delhi: 1.05, bangalore: 1.10 }` applied to base national prices
- All FIRECRAWL_HOOK comments preserved for future live data integration
- No API calls for pricing — all static with real researched values

