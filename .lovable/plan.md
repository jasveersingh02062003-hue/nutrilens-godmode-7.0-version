

# Smart Market -- Current State & What's Actually Left

## Assessment

After reviewing every file in detail, the Smart Market is **comprehensively built**. Here is what already works:

**Already Done:**
- MarketContext with shared city/prices/compare state across all 5 tabs
- Auto-location (GPS -> IP -> fallback) with city persistence
- Real food images via Unsplash with fade-in transitions (`food-images.ts` with 60+ mappings)
- MarketImage shared component with emoji fallback
- MarketHeroSection with 3-slide auto-rotation (5s) + AnimatePresence
- MarketBottomNav with spring animations, layoutId dot, and glow
- MarketItemCard with PES badges, images, nutrition tips, price trends
- QuickActionsRow, TopValueCards, CategoryGridHome, PriceDropsRow, EducationCard -- all with images + animations
- Flipkart-style Categories sidebar with layoutId active bar + AnimatePresence content swap
- Deals page with price drops, budget combo, PES leaderboard, price forecast, price alert sheet
- Compare page with quick pairs, category filters, selection bar, max 4 items
- My List with add, auto-generate from meal plan, share, summary bar, suggestions with MarketImage
- Skeleton loaders for loading states
- `prefers-reduced-motion` support in Hero, BottomNav
- Category deep-linking via `?cat=X` URL params

**What's genuinely remaining (minor polish only):**

1. **Duplicate `FadeImage` components** -- defined separately in `TopValueCards.tsx`, `QuickActionsRow.tsx`, `PriceDropsRow.tsx`, `MarketHeroSection.tsx`, and `CategoryGridHome.tsx`. Should all use the shared `MarketImage` component instead.

2. **MarketItemCard not using `MarketImage`** -- has its own inline image logic (lines 95-104) instead of the shared component.

3. **Recently Viewed uses inline image** -- `RecentlyViewedRow` in `Market.tsx` has its own `<img>` pattern instead of `MarketImage`.

4. **Hero slides array rebuilt every render** -- causes `useEffect` dependency instability (the `eslint-disable` comment masks this).

5. **No `prefers-reduced-motion` on MarketItemCard** -- stagger animations still run for motion-sensitive users.

6. **No `prefers-reduced-motion` on EducationCard** -- auto-rotate runs unconditionally.

---

## Implementation Plan (2 Phases)

### Phase 1: Consolidate to MarketImage everywhere

Replace all 5 duplicate `FadeImage` inline patterns with the shared `MarketImage` component.

**Files modified:**
- `src/components/market/TopValueCards.tsx` -- Remove local `FadeImage`, use `<MarketImage>` for item images
- `src/components/market/QuickActionsRow.tsx` -- Remove local `FadeImage`, use `<MarketImage>`
- `src/components/market/PriceDropsRow.tsx` -- Remove local `FadeImage`, use `<MarketImage>`
- `src/components/MarketHeroSection.tsx` -- Remove local `FadeImage`, use `<MarketImage>` for hero slide images
- `src/components/market/CategoryGridHome.tsx` -- Remove local `FadeImage`, use `<MarketImage>` for category backgrounds
- `src/components/MarketItemCard.tsx` -- Replace inline image/emoji block (lines 95-104) with `<MarketImage>`
- `src/pages/Market.tsx` -- Replace inline image in `RecentlyViewedRow` with `<MarketImage>`

### Phase 2: Accessibility & performance

- `src/components/MarketHeroSection.tsx` -- Memoize slides array with `useMemo` to fix `useEffect` dependency
- `src/components/MarketItemCard.tsx` -- Add `useReducedMotion` to skip stagger/scale animations
- `src/components/market/EducationCard.tsx` -- Add `useReducedMotion` to pause auto-rotate

---

## Animation Inventory

| Component | Animation | Status |
|-----------|-----------|--------|
| MarketBottomNav | Spring bounce + layoutId dot + glow | Done + reduced-motion |
| MarketHeroSection | AnimatePresence fade+slide, 5s auto-rotate | Done + reduced-motion |
| MarketItemCard | Stagger fade+slide, PES badge scale-in | Done (needs reduced-motion) |
| TopValueCards | Spring scale-in with medals | Done |
| QuickActionsRow | Stagger scale-in | Done |
| PriceDropsRow | Slide-in from right, pulse badge | Done |
| CategoryGridHome | Stagger fade-in with gradient overlay | Done |
| EducationCard | AnimatePresence text swap, 6s auto-rotate | Done (needs reduced-motion) |
| Categories sidebar | Stagger slide-in, layoutId active bar | Done |
| Categories content | AnimatePresence fade+slide on switch | Done |
| Compare selection bar | Height+opacity animate, scale bounce | Done |
| My List items | Slide-in/out with AnimatePresence | Done |
| MarketImage (shared) | opacity 0->1 on load, 300ms ease | Done |

**Changes in this plan:**
- Phase 1: All components use `MarketImage` for consistent 300ms fade-in
- Phase 2: `MarketItemCard` + `EducationCard` get `useReducedMotion`

---

## Files Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | -- | `TopValueCards.tsx`, `QuickActionsRow.tsx`, `PriceDropsRow.tsx`, `MarketHeroSection.tsx`, `CategoryGridHome.tsx`, `MarketItemCard.tsx`, `Market.tsx` |
| 2 | -- | `MarketHeroSection.tsx`, `MarketItemCard.tsx`, `EducationCard.tsx` |

**Total: 0 new files, 8 modified files, 0 backend changes**

