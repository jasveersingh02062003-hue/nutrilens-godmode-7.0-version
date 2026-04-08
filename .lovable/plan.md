

# Nutrition-Gap-Aware Sponsored Recommendation Engine

## What We're Building

A real-time recommendation engine that matches branded products to the user's **current nutritional gap + remaining budget**, then surfaces those recommendations consistently across Dashboard, Monika Chat, Meal Planner, Budget Planner, and Smart Market.

Instead of static banner ads, the system says: *"You're 25g protein short, budget has ₹45 left. Try Yoga Bar Protein Bar (20g protein, ₹40) — PES 72"*

---

## Architecture

```text
┌─────────────────────────────────────────────┐
│         useNutritionGapAds() Hook           │
│  (single entry point for all surfaces)      │
├─────────────────────────────────────────────┤
│  1. Read today's logged food → compute gap  │
│  2. Read remaining daily budget             │
│  3. Query packed_products + ad_campaigns    │
│     WHERE protein >= gap threshold          │
│     AND price <= remaining budget           │
│     AND pes_score >= 30                     │
│  4. Return matched ProductRecommendation[]  │
└──────────┬──────────┬───────────┬───────────┘
           │          │           │
    Dashboard    Monika Chat   Meal/Budget
    NudgeCard    System Prompt  Planner Cards
```

---

## Implementation Steps

### Step 1: Create Gap Calculation Utility
**New file:** `src/lib/nutrition-gap-ads.ts`

- `computeCurrentGaps()` — reads today's `DailyLog` via `getDailyTotals()`, compares against profile targets (`dailyProtein`, `dailyCalories`, `dailyCarbs`, `dailyFat`). Returns `{ proteinGap, calorieGap, carbGap, fatGap }`.
- `getRemainingBudget()` — uses `getUnifiedBudget()` daily budget minus today's logged meal costs. Returns `remainingBudget: number`.
- `matchProducts(gaps, budget)` — queries `packed_products` table filtered by: `protein >= min(gaps.proteinGap, 10)`, `selling_price <= budget`, `pes_score >= 30`, ordered by `cost_per_gram_protein ASC`. Returns top 3 matches.
- `matchSponsoredProducts(gaps, budget)` — same logic but joins against `ad_campaigns` + `ad_creatives` for active sponsored products. Sponsored results get priority over organic matches.

### Step 2: Create `useNutritionGapAds` Hook
**New file:** `src/hooks/useNutritionGapAds.ts`

- Wraps `computeCurrentGaps()` + `matchSponsoredProducts()` in a React Query call.
- Accepts `surface: 'dashboard' | 'chat' | 'planner' | 'market' | 'budget'` to vary the messaging tone.
- Returns `{ recommendations: ProductRecommendation[], gaps, remainingBudget, isLoading }`.
- Each `ProductRecommendation` includes: product info, campaign/creative IDs (if sponsored), a pre-built suggestion message, and impression/click tracking functions.
- Respects the existing session frequency cap from `useAdServing`.

### Step 3: Create Smart Recommendation Card Component
**New file:** `src/components/SmartProductNudge.tsx`

- Renders a card showing: the user's gap ("You need 25g more protein"), the product suggestion with price + PES badge, and a budget impact line ("₹40 — fits your remaining ₹45 budget").
- Two variants: `compact` (inline in planner/budget) and `full` (dashboard).
- IntersectionObserver for impression tracking. Click logs via `log-ad-event`.
- "Sponsored" badge only shown for paid campaigns; organic `packed_products` matches show as "Suggested".

### Step 4: Wire into Dashboard
**Modify:** `src/pages/Dashboard.tsx`

- Replace/augment existing `DashboardSponsoredCard` slots with `SmartProductNudge` using `useNutritionGapAds('dashboard')`.
- Place after `ProteinGapNudgeCard` — the organic nudge says "you're short", the sponsored nudge says "here's a product that fixes it".
- Only renders when there's both a gap AND a matching product.

### Step 5: Wire into Monika Chat
**Modify:** `supabase/functions/monika-chat/index.ts`

- Update the system prompt injection: instead of just passing campaign headlines, pass the user's computed gaps + matched products with prices.
- Monika can now say: *"You're 30g short on protein and have ₹50 left. A Yoga Bar (₹40, 20g protein, PES 72) would close most of that gap. Want me to add it?"*

### Step 6: Wire into Meal Planner
**Modify:** `src/components/MealPlanDashboard.tsx`

- When a meal slot is empty or under-target, show a `SmartProductNudge compact` card below the slot suggesting a product that fills the calorie/protein gap for that specific meal.
- Uses `useNutritionGapAds('planner')` with meal-specific gap calculation.

### Step 7: Wire into Budget Planner
**Modify:** `src/components/BudgetPlannerTab.tsx`

- In the "Smart Savings" section, show cost-efficient sponsored products: *"Switch to [Brand] protein bar — saves ₹15/day vs chicken for same protein."*
- Uses `cost_per_gram_protein` from `packed_products` to compute savings.

### Step 8: Update `ad_targeting` Table Usage
**Modify:** `src/hooks/useAdServing.ts`

- When fetching campaigns, also join `ad_targeting` and filter: `min_protein_gap <= user's actual gap` and `max_user_budget >= user's remaining budget`.
- This lets brands target only users who actually need their product category.

### Step 9: Add CPA Tracking
**New migration:** Add `ad_conversions` table

- Columns: `id`, `campaign_id`, `user_id`, `conversion_type` (add_to_plan, add_to_cart, logged), `product_id`, `created_at`.
- When a user adds a recommended product to their meal plan or logs it, fire a conversion event.
- Edge function `log-ad-event` updated to handle `event_type: 'conversion'`.

---

## Database Changes

1. **New table `ad_conversions`**: tracks when a recommended product is actually added/logged.
2. **No schema changes** to `packed_products` or `ad_campaigns` — existing columns suffice.

## Files Summary

| Action | File |
|--------|------|
| New | `src/lib/nutrition-gap-ads.ts` |
| New | `src/hooks/useNutritionGapAds.ts` |
| New | `src/components/SmartProductNudge.tsx` |
| Modify | `src/pages/Dashboard.tsx` |
| Modify | `src/components/MealPlanDashboard.tsx` |
| Modify | `src/components/BudgetPlannerTab.tsx` |
| Modify | `supabase/functions/monika-chat/index.ts` |
| Modify | `src/hooks/useAdServing.ts` |
| Modify | `supabase/functions/log-ad-event/index.ts` |
| Migration | `ad_conversions` table |

No breaking changes — all recommendations return empty arrays when no products match, so existing UI is unaffected.

