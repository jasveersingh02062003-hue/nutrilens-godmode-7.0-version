

# Smart Market — Phase 1 Implementation Plan

## What We're Building
The foundational layer of Smart Market: database tables, a new `/market` page with static data, sidebar entry from dashboard, and a Market pill tab in the Meal Planner. **No API/Firecrawl calls yet** — everything uses the existing static `price-database.ts` and `pes-engine.ts`, with the architecture ready for live data later.

## Steps

### Step 1: Create Database Tables
Two new tables via migration:

- **`price_history`** — stores daily price snapshots for trend charts
  - `id`, `city`, `item_name`, `avg_price`, `price_date`, `source`, `created_at`
  - RLS: authenticated users can read all; edge functions can insert/update

- **`packed_products`** — branded food products database
  - `id`, `brand`, `product_name`, `category` (enum: protein_drink, protein_bar, ready_to_eat, frozen, spread, supplement, beverage, snack), `mrp`, `selling_price`, `serving_size`, `calories`, `protein`, `carbs`, `fat`, `fiber`, `sugar`, `pes_score`, `cost_per_gram_protein`, `allergens` (jsonb), `platforms` (jsonb — array of {name, url, price}), `image_url`, `is_verified`, `created_at`, `updated_at`
  - RLS: authenticated can read; edge functions can insert/update

### Step 2: Seed Packed Products Data
Insert ~30-40 popular Indian packed food products (Amul Protein Buttermilk, Yoga Bar, Soya Chunks, MyFitness Peanut Butter, etc.) with real nutrition data and PES scores. This gives the Market page content from day one without needing scrapers.

### Step 3: Build the `/market` Page
New file: `src/pages/Market.tsx`

- **Header**: "Smart Market" + city from profile + "Updated" timestamp
- **Category pills**: Fresh Protein | Veggies | Dals | Dairy | Packed | Supplements
- **Sort options**: PES Score / Price / Protein
- **Food cards**: Each shows name, price, protein, ₹/g protein, PES badge (green/yellow/red), [Add to Plan] button
- **Fresh foods section**: Pulls from existing `price-database.ts` static data + `pes-engine.ts` rankings
- **Packed foods section**: Pulls from the new `packed_products` table
- **Price trend placeholder**: Empty chart area with "Price trends coming soon" (space reserved for Phase 2 charts)
- **Report Price section**: Existing community report flow via `reportPrice()` from `live-price-service.ts`

### Step 4: Add Sidebar/Hamburger to Dashboard Header
Modify `src/components/dashboard/DashboardHeader.tsx`:
- Replace the bell icon with a hamburger (Menu icon) button
- On tap → opens a right-side animated sheet/drawer with:
  - 🔔 Notifications (placeholder for now)
  - 🏪 Smart Market → navigates to `/market`
  - 👤 Profile → navigates to `/profile`
  - ⚙️ Settings (links to profile settings section)

### Step 5: Add Route for `/market`
In `src/App.tsx`:
- Add lazy import for Market page
- Add protected route: `/market`

### Step 6: Add "Market" Pill Tab in Meal Planner
Modify `src/components/MealPlannerTabs.tsx`:
- Add "Market" to `TAB_ITEMS` array
- When selected, show a compact version of the market rankings (top 10 PES-ranked items for the user's city)
- Include "View Full Market →" link to `/market`

### Step 7: Market Service Layer
New file: `src/lib/market-service.ts`
- `getMarketItems(city, category, sort)` — fetches from static DB + packed_products table
- `getPackedProducts(category)` — fetches from Supabase `packed_products` table
- `calculateCostPerGramProtein(price, protein)` — utility
- Architecture leaves clear hooks for Firecrawl/API integration later (the function signatures accept `source` param)

## Files Changed
| File | Action |
|------|--------|
| `supabase/migrations/xxx_create_market_tables.sql` | New — creates price_history + packed_products tables |
| `src/lib/market-service.ts` | New — market data service layer |
| `src/pages/Market.tsx` | New — full market page |
| `src/components/dashboard/DashboardHeader.tsx` | Modified — bell → hamburger menu with sidebar |
| `src/components/DashboardSidebar.tsx` | New — sidebar drawer component |
| `src/components/MealPlannerTabs.tsx` | Modified — add Market pill tab |
| `src/App.tsx` | Modified — add /market route |

## What's Left for Phase 2 (Later)
- Firecrawl scraping edge functions
- Govt Mandi API integration
- Price trend charts with real data
- Dashboard rotating banner
- Inline swap nudges in planner
- CTA buy links
- Savings tracker

