

# Phase 2: Smart Market — Full Experience Upgrade

## Overview
Transform the current skeleton Market page into a rich, production-quality experience with real product images, geo-aware pricing, price trend charts, "Report Price" flow, proper timestamps, and a polished UI. Firecrawl/API hooks remain as placeholders — everything else works with static + community data.

## What Changes

### 1. Update `packed_products` table — Add real image URLs
Insert real product image URLs (from brand CDNs / public sources) for all 35 seeded products. Also add ~15 more popular products (protein ice cream, frozen items, beverages).

### 2. Enhance Market Service (`src/lib/market-service.ts`)
- **Geo-aware pricing**: `getFreshMarketItems()` now checks `city_prices` table first (Supabase), falls back to `live-price-service.ts` resolution chain, then static
- **Add `imageUrl` field** to `MarketItem` interface — fresh foods get mapped food emoji/icons, packed get real image URLs
- **Add `lastUpdated` field** — shows when price was last refreshed
- **Add `priceChange` field** — percentage change vs yesterday (from `price_history` table when available)
- **Add sub-categories**: `dals`, `grains`, `fruits` to `MarketCategory`
- **New function**: `getMarketItemDetail(id, city)` — returns full detail with platform links + price history

### 3. Rebuild Market Page (`src/pages/Market.tsx`) — Full UX Overhaul
**Header**:
- City from profile with MapPin icon, tap to change (shows supported cities list)
- "Last updated" timestamp showing exact time of last price refresh
- Source indicator badge (Community / Static / Live when Firecrawl enabled later)

**Category pills** — expanded:
- 🥩 Protein | 🥬 Veggies | 🫘 Dals | 🥛 Dairy | 🌾 Grains | 🍌 Fruits | 📦 Packed | 💊 Supps

**Food Cards — redesigned with images**:
- Product image (real URL for packed, food emoji/icon for fresh)
- Name + brand (if packed)
- Price with unit + city label + price change arrow (↑5% / ↓12%)
- Protein grams + calories
- ₹/g protein metric
- PES badge (green/yellow/red)
- Source badge ("Static" / "Community" / "Live" placeholder)
- "Last updated: 6:30 AM" timestamp on each card
- Tap → opens detail sheet

**New: Market Item Detail Sheet** (`src/components/MarketItemDetailSheet.tsx`):
- Large product image
- Full nutrition breakdown (protein, carbs, fat, fiber, sugar, calories)
- PES score with explanation
- Price across platforms (for packed: Amazon ₹X, BigBasket ₹Y — with CTA buttons)
- 7-day price trend mini chart (from `price_history` — shows "No data yet" if empty, with note "Live trends coming soon with Firecrawl")
- Allergen warnings
- "Add to Meal Plan" button
- "Report Price" button

**New: Report Price Sheet** (`src/components/ReportPriceSheet.tsx`):
- Select item from list or type name
- Enter price + unit
- Auto-fills city from profile
- Submit → calls `reportPrice()` from `live-price-service.ts`
- Success toast: "Thanks! X people confirmed this price in {city}"

**New: Price Trend Chart** (`src/components/PriceTrendChart.tsx`):
- Uses Recharts (already in project)
- 7-day or 30-day toggle
- Line chart with price on Y axis, date on X
- Shows "No trend data yet — prices will be tracked once live scraping is enabled" when `price_history` is empty
- Space clearly reserved for Firecrawl data

### 4. Seed `price_history` with 7 days of static data
Insert mock historical prices for top 10 volatile items (Chicken, Eggs, Tomato, Onion, Paneer, Fish, Mutton, Milk, Soya Chunks, Potato) across 3 cities (Hyderabad, Mumbai, Bangalore) so the trend chart has something to show.

### 5. Geo-Aware City Logic Enhancement
- Read city from `profile.city` 
- If no city set → show a "Set your city" prompt card at top of market
- City selector modal with supported cities: Hyderabad, Bangalore, Mumbai, Delhi, Chennai, Pune, Kolkata, Ahmedabad, Jaipur, Lucknow
- All prices tagged with city name
- "Prices for {City}" prominently displayed

### 6. Update `MarketCompactView` (Planner tab)
- Show product images
- Show "Updated X mins ago" timestamp
- Show price change arrows
- Make cards tappable → navigate to `/market`

### 7. Dashboard Rotating Banner (`src/components/SmartMarketBanner.tsx`)
- Rotates daily showing market insight:
  - Day 1: Best protein value today
  - Day 2: Price drop alert
  - Day 3: Weekly savings summary
  - Day 4: Community report prompt
- Tap → navigate to `/market`
- Placed in Dashboard below calorie ring, above energy tracker

## Files Changed

| File | Action |
|------|--------|
| `src/lib/market-service.ts` | Modified — geo-aware pricing, image URLs, detail function |
| `src/pages/Market.tsx` | Rewritten — full UX with images, timestamps, categories |
| `src/components/MarketItemDetailSheet.tsx` | New — item detail with nutrition, platforms, chart |
| `src/components/ReportPriceSheet.tsx` | New — crowdsource price reporting UI |
| `src/components/PriceTrendChart.tsx` | New — Recharts line chart for price history |
| `src/components/SmartMarketBanner.tsx` | New — rotating dashboard banner |
| `src/components/MarketCompactView.tsx` | Modified — images, timestamps, tappable |
| `src/pages/Dashboard.tsx` | Modified — add SmartMarketBanner |
| DB: `packed_products` | Data update — add image_url for all products + 15 new products |
| DB: `price_history` | Data insert — 7 days × 10 items × 3 cities seed data |

## Technical Notes
- Real product images use public CDN URLs (Amul, BigBasket product pages, etc.)
- Fresh food items use high-quality food emoji as placeholder until Firecrawl image scraping is enabled
- Price source badge clearly shows "Static" with a note "Live prices coming soon" — transparent to user
- All Firecrawl integration points are clearly marked with `// FIRECRAWL_HOOK:` comments
- `_source` parameter in service functions ready for `'live'` mode

