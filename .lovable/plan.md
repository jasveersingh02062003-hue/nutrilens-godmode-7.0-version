

# Smart Market — Gap Analysis Fix Plan

## Current State Assessment

After reviewing all 5 market pages, the codebase already handles several items from the gap list:
- **Auto-location**: Already implemented in `Market.tsx` using `detectCity()` (GPS → IP → fallback), persists to profile + localStorage
- **City selector**: Already in `MarketPageHeader` with dropdown
- **Price alerts table**: Already exists (`price_alerts` table in DB)
- **Compare custom item add**: Already works — search bar + checkbox selection + max 4 items
- **MarketList with market item matching**: Already matches typed items to `MARKET_ITEMS` for price/protein

**Actual gaps remaining:**
1. Auto-location only runs on Shop tab — Categories, Deals, Compare, My List each read `profile.city` independently (no shared context)
2. Emojis used everywhere instead of real food images
3. No global market context (city/prices/compare list not shared across tabs)
4. Price Alert sheet not wired (just shows toast "coming soon")
5. My List has no "auto-generate from meal plan" logic
6. No loading skeletons or error states
7. No "Why eat this" tooltips with data

---

## Implementation Plan (3 Phases)

### Phase 1: Shared Market Context + Auto-Location Sync
Create a `MarketContext` provider that wraps all `/market` routes, providing:
- `city` (auto-detected once, shared across all tabs)
- `processedItems` (computed once, reused everywhere — eliminates duplicate `useMemo` in every page)
- `compareItems` + `toggleCompare()` (global compare state persists across tab switches)
- `myListItems` (shared with My List tab)

**Files:**
- **New**: `src/contexts/MarketContext.tsx` — context with city, processedItems, compare state
- **Edit**: `src/App.tsx` — wrap market routes with `<MarketProvider>`
- **Edit**: `src/pages/Market.tsx` — remove local city/processedItems state, consume from context
- **Edit**: `src/pages/MarketCategories.tsx` — consume city + processedItems from context
- **Edit**: `src/pages/MarketDeals.tsx` — consume from context
- **Edit**: `src/pages/MarketCompare.tsx` — consume compareItems from context
- **Edit**: `src/pages/MarketList.tsx` — consume city from context

### Phase 2: Real Food Images + "Why Eat This" Tips
Replace emoji placeholders with real Unsplash/static food images using a mapping. Add nutrition tips per item.

**Files:**
- **New**: `src/lib/food-images.ts` — mapping of `itemId → imageUrl` using free Unsplash CDN URLs (e.g., `https://images.unsplash.com/photo-xxxxx?w=200&h=200&fit=crop`)
- **New**: `src/lib/nutrition-tips.ts` — static mapping of `itemId|category → tip string` (e.g., "Eggs: complete protein with all 9 amino acids at ₹1/g protein")
- **Edit**: `src/components/MarketItemCard.tsx` — replace emoji with `<img>` using food-images map, fallback to emoji if no image
- **Edit**: `src/components/market/TopValueCards.tsx` — use real images
- **Edit**: `src/components/market/QuickActionsRow.tsx` — use real images in pills
- **Edit**: `src/components/market/CategoryGridHome.tsx` — use category hero images
- **Edit**: `src/pages/MarketCategories.tsx` — use images in top items list
- **Edit**: `src/pages/MarketDeals.tsx` — use images in price drops and grid cards

### Phase 3: Price Alert Sheet + My List Meal Plan Auto-Generate + Loading States
Wire up the price alert functionality and meal plan integration.

**Files:**
- **Edit**: `src/pages/MarketDeals.tsx` — open `PriceAlertSheet` on CTA tap (component already exists at `src/components/PriceAlertSheet.tsx`)
- **Edit**: `src/pages/MarketList.tsx` — add "Auto-generate from Meal Plan" button that reads `meal-planner-store` from localStorage, aggregates ingredients, matches to MARKET_ITEMS
- **New**: `src/components/market/MarketSkeleton.tsx` — skeleton loaders for item cards, category sidebar, deals sections
- **Edit**: `src/pages/Market.tsx` — show skeleton while location detecting
- **Edit**: `src/pages/MarketCategories.tsx` — show skeleton on category switch
- **Edit**: `src/pages/MarketDeals.tsx` — show skeleton on initial load

---

## Animation Plan

| Component | Animation | Already Done? |
|-----------|-----------|---------------|
| MarketBottomNav tabs | Spring bounce + layoutId dot | Yes |
| Item cards stagger | fade+slide up | Yes |
| Category sidebar active bar | layoutId slide | Yes |
| Content area swap | AnimatePresence fade+slide | Yes |
| **NEW: Image load** | Fade-in on load (`opacity 0→1`) | No — add |
| **NEW: Skeleton shimmer** | CSS shimmer animation | No — add |
| **NEW: Price alert success** | Scale bounce on save | No — add |

---

## Files Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | `contexts/MarketContext.tsx` | `App.tsx`, `Market.tsx`, `MarketCategories.tsx`, `MarketDeals.tsx`, `MarketCompare.tsx`, `MarketList.tsx` |
| 2 | `lib/food-images.ts`, `lib/nutrition-tips.ts` | `MarketItemCard.tsx`, `TopValueCards.tsx`, `QuickActionsRow.tsx`, `CategoryGridHome.tsx`, `MarketCategories.tsx`, `MarketDeals.tsx` |
| 3 | `market/MarketSkeleton.tsx` | `MarketDeals.tsx`, `MarketList.tsx`, `Market.tsx`, `MarketCategories.tsx` |

**Total: 4 new files, ~12 modified files, 0 backend changes**

Work will be divided across 3 implementation messages, one per phase.

