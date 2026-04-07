

# Smart Market — Category Images, In-Page Navigation & Veg Filter

## What We're Fixing

1. **Sidebar uses emojis** — The Categories sidebar shows text emojis (🥩, 🥚, etc.) instead of real food images. Need to replace with actual Unsplash images for a professional, Amazon/Flipkart-like feel.

2. **Subcategory navigation breaks flow** — When you tap "View All" or "Chicken" in Categories, `handleSubTap()` navigates to `/market?category=meat_seafood` which leaves the Categories page entirely and goes to Shop. Instead, items should render **inline** within the Categories page itself (like Flipkart's drill-down pattern).

3. **Veg-only filter** — The Shop page already has a `veg` filter (`isVeg` field exists on every `RawMarketItem`), but Categories, Deals, and Compare pages don't have it. Need a global veg toggle that persists across all tabs.

---

## On the Veg Feature — Should We Keep It?

**Yes, absolutely keep it.** Here's why:
- ~40% of Indians are vegetarian — it's a massive user segment
- The data already has `isVeg: boolean` on every market item
- Amazon/Flipkart/Swiggy Instamart all have prominent veg/non-veg toggles
- It filters out irrelevant items (no one vegetarian wants to scroll past chicken)
- Implementation cost is low since the data field already exists

**Recommendation:** Add a persistent veg toggle in MarketContext so it applies across all 5 tabs consistently.

---

## Implementation Plan (3 Phases)

### Phase 1: Replace Emojis with Real Images in Sidebar

Replace the emoji `<span>` in the Categories sidebar with actual food images using the existing `CATEGORY_IMAGES` from `food-images.ts`. Add small circular thumbnails (32x32) cropped from category hero images.

**Files modified:**
- `src/lib/food-images.ts` — Add a new `CATEGORY_THUMBNAILS` map with small circular image URLs (reuse existing Unsplash URLs but with `w=80&h=80&fit=crop` params) for all 11 categories
- `src/pages/MarketCategories.tsx` — Replace `<span className="text-2xl">{cat.emoji}</span>` (line 94) with `<img>` using the new thumbnail URLs, with emoji fallback on error. Also replace emoji in content area header (line 119)

**Animations:**
- Image fade-in: `opacity 0 -> 1` on load (300ms), consistent with MarketImage pattern

---

### Phase 2: Inline Item List in Categories Page (No Navigation Away)

Instead of navigating to `/market`, show the filtered item list directly inside the Categories right content area. When user taps "View All" or a subcategory, the items render below the subcategory grid within the same page.

**Files modified:**
- `src/pages/MarketCategories.tsx` — Major changes:
  - Add `selectedSub` state (currently only used to navigate away)
  - Replace `handleSubTap` to set local state instead of `navigate()`
  - When a subcategory is selected, show a filtered item list below the subcategory grid using the existing `MarketItemCard` component
  - Add sort pills (Best Value / Lowest Price / Most Protein) inline
  - Add filter chips (All / Veg Only / High Protein) inline
  - Add `MarketItemDetailSheet` for item tap (reuse from Market.tsx)
  - Add back button to return from item list to subcategory grid view
  - Import `MarketItemCard`, `MarketItemDetailSheet`, `useMarket` for processedItems

**Navigation flow after change:**
```text
Categories sidebar → Select "Meat" → See subcategories grid
  → Tap "Chicken" → Items appear below (same page, scrollable)
  → Tap item → Detail sheet opens (bottom sheet)
  → Back → Returns to subcategory grid
```

**Animations:**
- Item list entrance: `AnimatePresence` with stagger fade+slide (consistent with Shop page)
- Subcategory -> item list transition: height animation with `motion.div`
- Back button: slide-in from left

---

### Phase 3: Global Veg Toggle Across All Tabs

Add a persistent veg preference to MarketContext so it applies everywhere.

**Files modified:**
- `src/contexts/MarketContext.tsx` — Add `vegOnly: boolean` and `setVegOnly` to context state. Persist in localStorage. When `vegOnly` is true, filter `processedItems` to only `isVeg === true` items
- `src/pages/Market.tsx` — Read `vegOnly` from context; when toggled on, auto-set filter to 'veg'. Add a small leaf icon toggle in the header area or next to the Fresh/Packed toggle
- `src/pages/MarketCategories.tsx` — Apply `vegOnly` filter to items shown in the inline list and top value items. Show a "Veg Only" indicator badge when active
- `src/pages/MarketDeals.tsx` — Filter deals/combos/PES list by `vegOnly`
- `src/pages/MarketCompare.tsx` — Filter item selection list by `vegOnly`
- `src/pages/MarketList.tsx` — Filter suggestions by `vegOnly`
- `src/components/MarketPageHeader.tsx` — Add a small veg toggle (leaf icon) to the header bar that's visible on all market pages

**Design for veg toggle:**
- Small pill/chip in the header: green leaf icon + "Veg" label
- Active state: `bg-green-500/15 text-green-600 border-green-500/30`
- Inactive state: `bg-muted text-muted-foreground`
- Persists via `localStorage` key `nutrilens_veg_only`

**Animations:**
- Toggle: spring scale bounce on tap
- When toggling on: brief green pulse animation on the leaf icon

---

## Animation Summary

| Component | Animation | Phase |
|-----------|-----------|-------|
| Sidebar category thumbnails | Fade-in 300ms on load | 1 |
| Inline item list | AnimatePresence stagger fade+slide up | 2 |
| Sub -> items transition | Height expand with motion.div | 2 |
| Back to subcategories | Slide transition via AnimatePresence | 2 |
| Veg toggle | Spring scale bounce + green pulse | 3 |

## Files Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | -- | `food-images.ts`, `MarketCategories.tsx` |
| 2 | -- | `MarketCategories.tsx` |
| 3 | -- | `MarketContext.tsx`, `Market.tsx`, `MarketCategories.tsx`, `MarketDeals.tsx`, `MarketCompare.tsx`, `MarketList.tsx`, `MarketPageHeader.tsx` |

**Total: 0 new files, 8 modified files, 0 backend changes**

