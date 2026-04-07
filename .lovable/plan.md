

# Smart Market — Full UI/UX Overhaul Implementation Plan

## What We're Building

A complete visual and functional transformation of all 5 Smart Market tabs — inspired by Amazon/Flipkart's category-first design, but focused on **nutrition intelligence** (not shopping). Every page gets proper sections, animations, education, and visual hierarchy.

**Key principle:** This is NOT a marketplace. It's a **nutrition intelligence tool** that looks as polished as Amazon.

---

## Phase Breakdown (5 Phases)

### Phase 1: Foundation — MarketBottomNav polish + MarketPageHeader upgrade + Item Card redesign

**Files changed:**
- `src/components/MarketBottomNav.tsx` — Add entrance animation, active tab glow effect, haptic-style spring animations
- `src/components/MarketPageHeader.tsx` — Add city selector dropdown, search with animation, compare icon, better visual hierarchy
- `src/components/MarketItemCard.tsx` — Complete redesign: larger emoji area, PES badge overlay, price trend arrow, cost-per-gram protein highlight, "Why eat this" tooltip, improved CTAs

**Animations (Phase 1):**
| Element | Animation | Spec |
|---------|-----------|------|
| MarketBottomNav tabs | Spring bounce on tap | `stiffness: 300, damping: 25` |
| Active tab indicator | `layoutId` sliding dot | Framer Motion shared layout |
| Item card entrance | Stagger fade + slide up | `delay: index * 0.03, y: 12 → 0` |
| PES badge | Scale-in on mount | `scale: 0.8 → 1, duration: 0.2` |
| Price trend arrow | Pulse animation for drops | CSS `animate-pulse` on green arrows |

---

### Phase 2: Shop Homepage (`/market`) — Complete section-by-section redesign

**File changed:** `src/pages/Market.tsx`

**New section layout (top to bottom):**

```text
┌─ MarketPageHeader (sticky, with city + search) ─┐
│                                                   │
│ 1. Hero Banner (rotating — best value today)      │
│ 2. Quick Actions Row (horizontal scroll pills)    │
│    [🥚 Eggs ₹7] [🍗 Chicken ₹220] [🥛 Milk ₹28]  │
│ 3. Today's Best Value (top 3 PES cards, 3-col)    │
│ 4. Browse by Category (2x3 grid with gradients)   │
│ 5. "Did You Know?" Education Card (swipeable)     │
│ 6. Budget Hero Picks (horizontal scroll)          │
│ 7. Compare & Save (VS card)                       │
│ 8. Price Drops This Week (horizontal scroll)      │
│ 9. City Prices Banner                             │
│ 10. Price Trends (expandable chart)               │
│ 11. Savings Tracker                               │
│ 12. Report a Price                                │
└───────────────────────────────────────────────────┘
```

**New sub-components:**
- `src/components/market/QuickActionsRow.tsx` — Top 6 items as pill buttons with live prices
- `src/components/market/TopValueCards.tsx` — 3-column PES-ranked cards with emoji, price, protein, trend
- `src/components/market/CategoryGridHome.tsx` — 2x3 visual grid (large emoji + gradient bg + label + item count)
- `src/components/market/EducationCard.tsx` — Swipeable nutrition facts ("100g paneer = 2 eggs protein but 3x cost")
- `src/components/market/PriceDropsRow.tsx` — Horizontal scroll of items with price drop % badges

**Animations (Phase 2):**
| Element | Animation |
|---------|-----------|
| Hero banner | Auto-rotate every 5s with fade transition |
| Quick actions pills | Horizontal scroll with snap + scale on tap |
| Best Value cards | Stagger scale-in (0.95 → 1) |
| Category grid tiles | Stagger fade-in with 40ms delay |
| Education card | Swipe gesture (drag horizontal) |
| Price drop badges | Subtle pulse on red/green % |

---

### Phase 3: Categories Page (`/market/categories`) — Flipkart-style sidebar + content

**File changed:** `src/pages/MarketCategories.tsx` (complete rewrite)

**Layout:**
```text
┌──────────┬─────────────────────────────┐
│ Sidebar  │ Content Area               │
│ (80px)   │                            │
│ fixed    │ Hero insight banner        │
│          │ Subcategory 3-col grid     │
│ 🥩 Meat  │ Popular Comparisons        │
│ 🥚 Eggs  │ Smart Insight card         │
│ 🥬 Veg   │ Items list (scrollable)    │
│ 🫘 Dals  │                            │
│ 🥛 Dairy │                            │
│ 🌾 Grain │                            │
│ 🍌 Fruit │                            │
│ 📦 Pack  │                            │
└──────────┴─────────────────────────────┘
```

**How it works:**
- Left sidebar: 80px fixed, vertical scroll, emoji + label per category
- Active category: primary left border + primary/10 background
- Right area changes dynamically per category selection
- Each category shows: hero insight → subcategory grid → popular comparisons → smart nutrition fact
- Tapping subcategory navigates to `/market?category=X&sub=Y`

**Animations (Phase 3):**
| Element | Animation |
|---------|-----------|
| Sidebar categories | Fade in stagger on mount |
| Active indicator | `layoutId` left border slide |
| Content area swap | Fade + slide right (exit left, enter right) |
| Subcategory grid | Scale-in stagger |

---

### Phase 4: Deals Page (`/market/deals`) — Rich sections + visual urgency

**File changed:** `src/pages/MarketDeals.tsx` (complete rewrite)

**New sections:**
1. **Price Drops banner** — Horizontal scroll of items with red/green % badges
2. **Budget Protein Combos** — "Get 100g protein under ₹150/day" with combo card (Eggs + Chicken + Milk)
3. **Best PES This Week** — Ranked list with PES badges, rank numbers, medals for top 3
4. **High Protein Low Cost** — 2-column grid cards
5. **Price Forecast** — "Chicken likely to drop next week" insight card
6. **Set Price Alert CTA** — Button to open price alert sheet

**Animations (Phase 4):**
| Element | Animation |
|---------|-----------|
| Price drop badges | Entrance: slide-in from right |
| Combo card | Scale-in with spring |
| Rank list items | Stagger slide-up |
| Forecast card | Fade-in with delay |

---

### Phase 5: Compare (`/market/compare`) + My List (`/market/list`) — Polish

**Files changed:**
- `src/pages/MarketCompare.tsx` — Add category filter tabs, pre-built comparison pairs ("Eggs vs Paneer"), AI verdict text, side-by-side nutrition matrix
- `src/pages/MarketList.tsx` — Add auto-generated list from meal plan, estimated total cost, protein coverage %, export/share buttons, "Buy on BigBasket" CTA

**New in Compare:**
- Pre-built comparison suggestions at top: "🥚 Eggs vs 🧀 Paneer", "🍗 Chicken vs 🐟 Fish"
- Category filter pills to narrow item list
- Selected items show mini nutrition preview before full compare

**New in My List:**
- "Auto-generate from meal plan" button that reads weekly planner data
- Each item shows estimated price + protein contribution
- Summary bar: Total ₹, Protein coverage %
- Share as text / Export as image

**Animations (Phase 5):**
| Element | Animation |
|---------|-----------|
| Comparison pairs | Horizontal scroll with snap |
| Item selection | Checkbox scale bounce |
| List items | Slide-in from left on add, slide-out on remove |
| Summary bar | Sticky with fade-in |

---

## Animation Summary (All Phases)

| Animation Type | Where Used | Implementation |
|----------------|-----------|----------------|
| **Stagger fade-in** | Item lists, grids, cards | Framer `initial/animate` with `delay: i * 0.03` |
| **Spring bounce** | Tab taps, button presses | `type: 'spring', stiffness: 300, damping: 25` |
| **Layout animation** | Active indicators (nav dot, sidebar border) | Framer `layoutId` |
| **Slide transitions** | Category content swap, list add/remove | `AnimatePresence` + `x` or `y` transform |
| **Scale-in** | PES badges, cards on mount | `scale: 0.9 → 1, opacity: 0 → 1` |
| **Auto-rotate** | Hero banner, education cards | `useEffect` + `setInterval` + fade transition |
| **Pulse** | Price drop indicators, alerts | Tailwind `animate-pulse` |

---

## Data Flow (No Backend Changes)

All data comes from existing sources:
- `MARKET_ITEMS` from `src/lib/market-data.ts` — item database
- `getCityPrice()` — city-specific pricing
- `calculateMarketPES()` — PES scoring
- `scopedStorage` — My List persistence
- `UserProfileContext` — city preference
- Meal planner data — for auto-generating grocery lists

---

## Files Created/Modified Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | — | `MarketBottomNav.tsx`, `MarketPageHeader.tsx`, `MarketItemCard.tsx` |
| 2 | `market/QuickActionsRow.tsx`, `market/TopValueCards.tsx`, `market/CategoryGridHome.tsx`, `market/EducationCard.tsx`, `market/PriceDropsRow.tsx` | `Market.tsx`, `MarketHeroSection.tsx` |
| 3 | — | `MarketCategories.tsx` (rewrite) |
| 4 | — | `MarketDeals.tsx` (rewrite) |
| 5 | — | `MarketCompare.tsx`, `MarketList.tsx` |

**Total: 5 new sub-components, 9 modified files, 0 backend changes**

