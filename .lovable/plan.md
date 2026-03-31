

# Fix: Budget-Meal Planner Sync & Feasibility Warnings

## Problems Identified

From the screenshots:
1. **Budget ₹5000/month = ₹166/day, but meal plan only uses ₹90/day** — generator picks cheap recipes and doesn't try to maximize budget utilization to hit nutrition targets
2. **Day Total: 1788 kcal, P: 85g** — far below targets of 2546 kcal, 191g protein. The portion scaling exists but isn't aggressive enough, and recipe selection doesn't prioritize high-protein options
3. **Day costs wildly vary** (₹90 to ₹444) — no daily budget cap enforcement
4. **No feasibility warning visible** — the `validatePlanFeasibility` call passes `{} as any` for budget settings, and the warning logic doesn't account for the real constraint (191g protein at ₹166/day is likely infeasible)
5. **Weekly budget bar shows ₹1155** — this is the weekly budget field value, but monthly is ₹5000. The dashboard shows weekly budget instead of deriving from monthly

## Root Causes

1. **Generator picks recipes by PES score but doesn't enforce a minimum daily cost or calorie floor** — it finds "good enough" cheap recipes and stops
2. **Portion scaling is capped at 2.5x** — if a recipe has 280 kcal and the slot needs 636 kcal (25% of 2546), scale would be 2.27x which is fine, but protein doesn't scale proportionally to hit 191g
3. **No post-generation budget utilization pass** — if total cost < daily budget, system doesn't try to swap in more expensive/protein-rich alternatives
4. **Feasibility check is broken in dashboard** — called with `{} as any` instead of real settings
5. **Recipe database protein content is too low** — most recipes have 7-14g protein per serving. Even scaled 2x, a 4-meal day maxes at ~80-100g protein. Need high-protein recipes (30g+)

## Plan

### Step 1: Fix Feasibility Warning (shows properly)
- In `MealPlanDashboard.tsx`, fix the `validatePlanFeasibility` call — remove `{} as any` parameter, pass actual budget settings
- Make the warning prominently visible with actionable text: "Your budget of ₹166/day cannot meet 191g protein. Minimum budget: ₹X/day or reduce protein target to Yg"

### Step 2: Add High-Protein Budget Recipes to Database
- Add 10-15 high-protein, budget-friendly recipes to `recipes.ts`:
  - Soya Chunk Curry (52g protein, ~₹25)
  - Egg Bhurji 4-egg (24g protein, ~₹30)
  - Chana Masala large (18g protein, ~₹30)
  - Dal Fry large (20g protein, ~₹25)
  - Paneer Bhurji (22g protein, ~₹50)
  - Soya Keema (40g protein, ~₹30)
  - Moong Sprouts Salad (15g protein, ~₹15)
  - Double Egg Omelette (18g protein, ~₹20)
  - Rajma Rice Bowl (16g protein, ~₹35)
  - Sattu Drink (20g protein, ~₹15)
  - Whey Protein Shake if applicable
- These recipes specifically designed to be protein-dense AND budget-friendly

### Step 3: Enforce Daily Budget Utilization in Generator
- In `meal-plan-generator.ts`, after generating all meals for a day:
  - Calculate `remainingBudget = dailyBudget - dayCost`
  - If `remainingBudget > 20` AND `dayProtein < targetProtein * 0.9`, attempt to swap the lowest-protein meal for a higher-protein alternative that costs up to `currentMealCost + remainingBudget`
  - This ensures the generator USES the available budget instead of leaving ₹70+ unspent

### Step 4: Enforce Daily Budget Cap
- In the generator, if `dayCost > dailyBudget * 1.15`, swap the most expensive meal for a cheaper alternative
- This prevents ₹444 days when budget is ₹166

### Step 5: Show Day-Level Warnings in Dashboard
- Under the Day Total card, show colored indicators:
  - Red if calories < 80% of target or protein < 80% of target
  - Amber if budget exceeded by >15%
  - Green if all within range
- Add text like "Day is ₹76 under budget — protein 106g short of 191g target"

### Step 6: Fix Weekly vs Monthly Budget Display
- In dashboard budget bar, use `getUnifiedBudget()` to derive weekly budget from monthly (₹5000/month → ₹1166/week) instead of reading raw weekly field

## Technical Details

**Files to modify:**
- `src/lib/recipes.ts` — add 10-15 high-protein budget recipes
- `src/lib/meal-plan-generator.ts` — add budget utilization pass + daily cap enforcement
- `src/components/MealPlanDashboard.tsx` — fix feasibility call, add day-level warnings, fix budget bar source
- `src/lib/plan-validator.ts` — fix `validateDaySync` to use scaled values (currently uses raw recipe values)

**Key constraint:** With ₹166/day budget and Indian food prices, ~120-130g protein is realistically achievable (soya chunks, eggs, dal). 191g protein at ₹166/day may still be infeasible — the system will properly warn and suggest either increasing budget or reducing protein target.

