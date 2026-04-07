

# Smart Market — Visual & UX Polish Plan

## Current State

The 5-phase overhaul is already implemented with:
- MarketContext providing shared city/prices/compare state across all tabs
- MarketBottomNav with spring animations and layoutId dot
- MarketItemCard with PES badges, image support, nutrition tips, price trends
- Shop homepage with Hero, QuickActions, TopValue, CategoryGrid, Education, PriceDrops sections
- Flipkart-style Categories with sidebar + content area
- Deals with price drops, budget combos, PES leaderboard, price forecast, alert CTA
- Compare with quick pairs, category filters, selection bar
- My List with add, auto-generate from meal plan, share, summary bar
- food-images.ts with Unsplash URLs, nutrition-tips.ts with per-item tips
- MarketSkeleton loading states

## Remaining Gaps (After Reviewing Code)

1. **MarketItemCard missing `itemId` prop** -- the card accepts `itemId?` but Market.tsx never passes it, so images and tips never render for item cards on the Shop page
2. **TopValueCards and QuickActionsRow still use emoji** -- no image support integrated
3. **PriceDropsRow still uses emoji** -- no image support
4. **CategoryGridHome still uses emoji** -- no category images used
5. **Hero banner not rotating** -- it's static, shows only "best value today" with no auto-rotate
6. **No "Recently Viewed" section** on homepage
7. **Categories page missing category hero images** -- `getCategoryImage` exists but isn't used
8. **No image fade-in animation** on image load across components
9. **MarketDeals "High Protein Low Cost" grid** still uses emoji, not images
10. **Compare page item list** uses images correctly (already done)

## Implementation Plan (3 Phases)

### Phase 1: Wire Images Everywhere + Fix itemId Prop

Pass `itemId` to MarketItemCard in Market.tsx so real images load. Add image support to TopValueCards, QuickActionsRow, PriceDropsRow, and CategoryGridHome.

**Files modified:**
- `src/pages/Market.tsx` -- pass `itemId={item.id}` to MarketItemCard; pass image URLs in topValueItems and priceDrops data
- `src/components/market/TopValueCards.tsx` -- accept `itemId`, use `getFoodImage()` with fade-in `<img>`, fallback to emoji
- `src/components/market/QuickActionsRow.tsx` -- use `getFoodImage()` for each pill item
- `src/components/market/PriceDropsRow.tsx` -- accept `itemId`, use `getFoodImage()` for each drop card
- `src/components/market/CategoryGridHome.tsx` -- use `getCategoryImage()` as background for category tiles

### Phase 2: Hero Banner Auto-Rotate + Category Hero Images + Recently Viewed

Make the hero banner rotate between 3 data-driven slides. Add category hero images to the Categories page. Add a "Recently Viewed" horizontal scroll at the bottom of the Shop homepage.

**Files modified:**
- `src/components/MarketHeroSection.tsx` -- rewrite to auto-rotate between 3 slides: (1) Best Value Today, (2) Biggest Price Drop, (3) Budget Protein Challenge. Use `AnimatePresence` fade transition with 5s interval and dot indicators
- `src/pages/MarketCategories.tsx` -- add `getCategoryImage()` as a banner image above the category insight card
- `src/pages/Market.tsx` -- add "Recently Viewed" section using localStorage tracking; add `biggestDrop` data to hero props

### Phase 3: Image Fade-In Animation + Deals Image Fix + Visual Polish

Add consistent image fade-in across all market components. Fix remaining emoji-only spots.

**Files modified:**
- `src/components/market/MarketImage.tsx` (NEW) -- shared image component with `opacity: 0 -> 1` fade on load, emoji fallback, rounded corners, consistent sizing
- `src/pages/MarketDeals.tsx` -- use `MarketImage` in "High Protein Low Cost" grid and "Budget Protein Combo" section
- `src/components/MarketItemCard.tsx` -- replace inline image logic with `MarketImage` component
- `src/pages/MarketCategories.tsx` -- use `MarketImage` in top items list
- `src/pages/MarketCompare.tsx` -- use `MarketImage` in item list

---

## Animation Summary

| Component | Animation | Phase |
|-----------|-----------|-------|
| MarketImage (new shared component) | `opacity: 0 -> 1` on img load, 300ms ease | 3 |
| Hero banner slides | `AnimatePresence` fade + slide, 5s auto-rotate | 2 |
| Hero dot indicators | `layoutId` width transition for active dot | 2 |
| Category hero image | Fade-in on category switch via `AnimatePresence` | 2 |
| TopValueCards images | Image fade-in on load | 1 |
| QuickActions pill images | Image fade-in, emoji fallback | 1 |
| PriceDrops card images | Image fade-in, emoji fallback | 1 |
| CategoryGrid backgrounds | Subtle gradient overlay on category image | 1 |
| Recently Viewed scroll | Stagger fade-in with `delay: i * 0.04` | 2 |

## Files Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | -- | `Market.tsx`, `TopValueCards.tsx`, `QuickActionsRow.tsx`, `PriceDropsRow.tsx`, `CategoryGridHome.tsx` |
| 2 | -- | `MarketHeroSection.tsx`, `MarketCategories.tsx`, `Market.tsx` |
| 3 | `market/MarketImage.tsx` | `MarketDeals.tsx`, `MarketItemCard.tsx`, `MarketCategories.tsx`, `MarketCompare.tsx` |

**Total: 1 new file, ~9 modified files, 0 backend changes**

