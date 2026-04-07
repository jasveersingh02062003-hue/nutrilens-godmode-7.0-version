

# Smart Market — Remaining Visual Polish Plan

## Current State

The Smart Market is already fully built with:
- 5 tabs (Shop, Categories, Deals, Compare, My List) all functional
- MarketContext providing shared city/prices/compare state
- MarketBottomNav with spring animations and layoutId dot
- Real food images via Unsplash (food-images.ts) with fade-in
- MarketHeroSection with 3-slide auto-rotation (5s interval)
- Flipkart-style Categories with sidebar + content area
- Education cards, price drops, PES rankings, budget combos
- Compare with quick pairs and category filters
- My List with auto-generate from meal plan

## What Actually Needs Fixing (After Full Code Review)

After reviewing every file, there are **7 concrete issues** remaining:

1. **Broken Unsplash URL** -- `mk_potato` has a typo in URL (`ber3a3` instead of valid hash), will show error/emoji fallback
2. **MarketImage component created but never used** -- `MarketImage.tsx` exists with proper fade-in + fallback logic, but Deals, Categories, and Compare pages all use inline `<img>` + emoji fallback patterns instead of the shared component
3. **No `prefers-reduced-motion` support** -- Framer Motion animations run unconditionally, bad for accessibility
4. **CategoryGridHome "View All" button navigates wrong** -- clicking any category goes to `/market/categories` but doesn't pre-select that category
5. **Compare page doesn't use MarketImage** -- inline image/emoji pattern duplicated
6. **My List suggestions show only emoji** -- `getFoodImage()` not used for suggestion cards or list items
7. **Hero banner `useEffect` dependency** -- `slides.length` causes unnecessary re-renders because `slides` is rebuilt every render

---

## Implementation Plan (2 Phases)

### Phase 1: Fix Data Issues + Wire MarketImage Component Everywhere

Replace all inline image/emoji patterns with the shared `MarketImage` component for consistency. Fix the broken URL and category navigation.

**Files modified:**
- `src/lib/food-images.ts` -- Fix `mk_potato` broken URL
- `src/pages/MarketDeals.tsx` -- Replace 4 inline image patterns with `<MarketImage>` (price drops, combo, PES list, high protein grid)
- `src/pages/MarketCategories.tsx` -- Replace top items inline image with `<MarketImage>`
- `src/pages/MarketCompare.tsx` -- Replace item list inline image with `<MarketImage>`
- `src/pages/MarketList.tsx` -- Add `<MarketImage>` to suggestion cards and list items
- `src/components/market/CategoryGridHome.tsx` -- Pass selected category key to navigate (`/market/categories?cat=X`)
- `src/pages/MarketCategories.tsx` -- Read `?cat=X` from URL to pre-select active category on mount

### Phase 2: Accessibility + Hero Performance Fix

- `src/components/MarketHeroSection.tsx` -- Memoize slides array to prevent `useEffect` dependency churn; pause auto-rotate when user has `prefers-reduced-motion`
- `src/components/MarketItemCard.tsx` -- Add `motion.prefersReducedMotion` check
- `src/components/MarketBottomNav.tsx` -- Respect `prefers-reduced-motion` for spring animations

---

## Animation Inventory (Already Working)

| Component | Animation | Status |
|-----------|-----------|--------|
| MarketBottomNav | Spring bounce + layoutId dot + glow | Working |
| MarketHeroSection | AnimatePresence fade+slide, 5s auto-rotate, dot indicators | Working (perf fix needed) |
| MarketItemCard | Stagger fade+slide up, PES badge scale-in, price trend pulse | Working |
| TopValueCards | Spring scale-in with medals | Working |
| QuickActionsRow | Stagger scale-in with image fade | Working |
| PriceDropsRow | Slide-in from right, drop badge pulse | Working |
| CategoryGridHome | Stagger fade-in with gradient overlay | Working |
| EducationCard | AnimatePresence text swap, 6s auto-rotate, nav arrows | Working |
| Categories sidebar | Stagger slide-in, layoutId active bar | Working |
| Categories content | AnimatePresence fade+slide on category switch | Working |
| Deals sections | Stagger fade+slide, spring scale for combo | Working |
| Compare selection bar | Height+opacity animate, scale bounce on check | Working |
| My List items | Slide-in/out with AnimatePresence | Working |

**New in this plan:**
| Component | Animation | Phase |
|-----------|-----------|-------|
| MarketImage (shared) | opacity 0->1 on load, 300ms ease | 1 |
| My List suggestion images | Fade-in via MarketImage | 1 |
| All animations | Respect `prefers-reduced-motion` | 2 |

---

## Files Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | -- | `food-images.ts`, `MarketDeals.tsx`, `MarketCategories.tsx`, `MarketCompare.tsx`, `MarketList.tsx`, `CategoryGridHome.tsx` |
| 2 | -- | `MarketHeroSection.tsx`, `MarketItemCard.tsx`, `MarketBottomNav.tsx` |

**Total: 0 new files, 9 modified files, 0 backend changes**

