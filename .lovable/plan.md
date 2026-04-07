

# Phase 2.5: Smart Market — Gap Fix & Polish

## Identified Gaps

After auditing the codebase against the blueprint, here are the missing pieces:

### Critical Gaps (Blocking UX)
1. **28 packed products have NULL image_url** — cards show nothing for most packed items
2. **city_prices table has 0 rows** — fresh foods have no geo-aware prices, everything falls back to static
3. **City picker on Market page doesn't actually update the profile** — tapping a city does nothing
4. **Profile page has no Smart Market link** — blueprint requires it
5. **"Add to Meal Plan" button in detail sheet is non-functional** — just a dead button

### Data Gaps
6. **price_history has data for only Hyderabad (70 rows)** — Mumbai and Bangalore have only 35 rows each, and dates may not cover recent 7 days (seeded data might be stale)
7. **No city_prices seeded** — the geo-aware pricing layer (Step 2 in the resolution chain) has zero data

### UX Polish Gaps
8. **No savings tracker section** on Market page (blueprint shows "This week: ₹340 saved")
9. **Market page has no "Top Protein Value Today" header section** — just a flat list
10. **Dashboard SmartMarketBanner** doesn't show price drop data since price_history may be stale

## Plan

### Step 1: Fix Packed Product Images
Update all 28 products with NULL image_url using real Amazon/brand CDN URLs via the insert tool.

### Step 2: Seed city_prices with Fresh Food Prices
Insert current-date static prices for 15+ fresh foods across 3 cities (Hyderabad, Mumbai, Bangalore) into `city_prices`. This makes the geo-aware pricing layer active.

### Step 3: Refresh price_history with Recent Dates  
Re-seed price_history with the last 7 days (relative to today) so trend charts actually show data. Cover all 10 items across 3 cities.

### Step 4: Fix City Picker — Actually Update Profile
In `Market.tsx`, when a user taps a city pill, update the profile's city field via Supabase and local context. Currently it just closes the dropdown.

### Step 5: Add Smart Market Link to Profile Page
Add a "Smart Market" navigation card in the Profile page between existing menu items.

### Step 6: Wire "Add to Meal Plan" Button
In `MarketItemDetailSheet.tsx`, make the "Add to Meal Plan" button functional — navigate to the meal planner or show a toast confirming the item was noted.

### Step 7: Add "Top Value Today" Hero Section
Add a highlighted hero card at the top of the Market items list showing the #1 PES-ranked item for the user's city with a larger visual treatment.

## Files Changed

| File | Action |
|------|--------|
| DB: `packed_products` | Data update — add image_url for 28 products |
| DB: `city_prices` | Data insert — seed fresh food prices for 3 cities |
| DB: `price_history` | Data insert — refresh 7 days × 10 items × 3 cities |
| `src/pages/Market.tsx` | Modified — fix city picker to update profile, add hero card |
| `src/pages/Profile.tsx` | Modified — add Smart Market navigation link |
| `src/components/MarketItemDetailSheet.tsx` | Modified — wire Add to Meal Plan button |

