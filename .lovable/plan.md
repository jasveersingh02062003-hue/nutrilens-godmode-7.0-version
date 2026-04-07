

# Smart Market — Full Navigation Replacement (Swiggy Instamart-style)

## What We're Building

When a user navigates to `/market`, the bottom navigation bar **completely replaces** with a market-specific nav bar containing 5 market tabs: Shop, Categories, Deals, Compare, My List. When the user exits (back arrow or browser back), the normal bottom nav returns.

## Architecture

```text
Normal routes (/dashboard, /progress, etc.)
  → BottomNav renders: Home | Progress | Camera | Planner | Profile

Market routes (/market, /market/categories, /market/deals, /market/compare, /market/list)
  → MarketBottomNav renders: Shop | Categories | Deals | Compare | My List
```

## Implementation — 5 Steps

### Step 1: Create MarketBottomNav component
**New file: `src/components/MarketBottomNav.tsx`**
- 5 tabs: Shop (`/market`), Categories (`/market/categories`), Deals (`/market/deals`), Compare (`/market/compare`), My List (`/market/list`)
- Same visual style as BottomNav (backdrop blur, fixed bottom, safe area padding)
- Active tab detection via `useLocation()`
- Icons: Store, LayoutGrid, Flame, Scale, ClipboardList (from lucide)

### Step 2: Create 4 new market sub-pages
**New files:**
- `src/pages/MarketCategories.tsx` — Full-screen category grid with subcategory drill-down (reuses `MarketCategoryGrid` but full-page, not inline)
- `src/pages/MarketDeals.tsx` — Price drops, budget picks, seasonal offers (reuses `MarketSmartSections` and `MarketHeroSection` data)
- `src/pages/MarketCompare.tsx` — Dedicated compare page (reuses existing `ComparisonSheet` logic but as a full page with item picker)
- `src/pages/MarketList.tsx` — "My List" — items user has saved/added, with "Add to Meal Plan" action and export

Each page gets a shared `MarketPageHeader` at top with back arrow + city + search.

### Step 3: Create shared MarketPageHeader component
**New file: `src/components/MarketPageHeader.tsx`**
- Back arrow (navigates to `/dashboard`)
- "Smart Market" title + city badge
- Search icon (opens search)
- Consistent across all `/market/*` routes

### Step 4: Modify BottomNav to hide on market routes
**Edit: `src/components/BottomNav.tsx`**
- Add route check: if `location.pathname.startsWith('/market')`, return `null`
- This makes BottomNav invisible on all market routes

### Step 5: Register market routes in App.tsx
**Edit: `src/App.tsx`**
- Add routes: `/market/categories`, `/market/deals`, `/market/compare`, `/market/list`
- All wrapped in `ProtectedRoute`
- Import `MarketBottomNav` and render it when `location.pathname.startsWith('/market')`
- Add `/market` paths to `HIDE_NAV_ROUTES` is NOT needed — instead, BottomNav self-hides and MarketBottomNav self-shows

### Step 6: Update existing Market.tsx
**Edit: `src/pages/Market.tsx`**
- Remove the back arrow header (replaced by shared `MarketPageHeader`)
- Add `MarketBottomNav` import or handle via App.tsx layout
- Ensure bottom padding for the market nav bar

## Files Changed

| File | Action |
|------|--------|
| `src/components/MarketBottomNav.tsx` | New — market-specific bottom nav with 5 tabs |
| `src/components/MarketPageHeader.tsx` | New — shared header for all market pages |
| `src/pages/MarketCategories.tsx` | New — full-page category browser |
| `src/pages/MarketDeals.tsx` | New — deals & budget picks page |
| `src/pages/MarketCompare.tsx` | New — dedicated compare page |
| `src/pages/MarketList.tsx` | New — saved items / grocery list page |
| `src/components/BottomNav.tsx` | Modified — hide when on `/market*` routes |
| `src/App.tsx` | Modified — add market sub-routes + render MarketBottomNav conditionally |
| `src/pages/Market.tsx` | Modified — remove duplicate header, add bottom padding |

## Technical Notes
- Camera button is **untouched** — it stays in the main BottomNav which is simply hidden on market routes
- Back arrow in MarketPageHeader navigates to `/dashboard` (not browser back) for predictable behavior
- Android hardware back on `/market` goes to dashboard; on `/market/categories` goes to `/market`
- All market sub-pages are lazy-loaded like other routes
- No backend changes — all frontend routing

