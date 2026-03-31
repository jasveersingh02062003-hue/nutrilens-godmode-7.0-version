

# Constraint-Based Meal Planner Overhaul

## Current State Analysis

The system already has:
- ~80 recipes with nutrition data and cost estimates
- High-protein budget recipes (soya, egg combos) added recently
- Budget engine with `getUnifiedBudget()` deriving daily from monthly
- Feasibility validation via `validateBudgetVsGoals()`
- Portion scaling (0.5x-2.5x) and budget utilization/cap passes in generator
- Day-level warnings in dashboard

**But the fundamental problem remains**: the generator picks recipes by PES score, then tries to fix protein/budget in post-passes. This "pick-then-patch" approach cannot reliably hit targets. The user wants a mathematically rigorous system.

## Root Causes (What's Actually Broken)

1. **Recipe selection is score-based, not constraint-based** — PES score favors satiety/cost-efficiency, not hitting exact targets
2. **Protein post-pass only swaps ONE meal** — if all 4 meals are low-protein, swapping 1 doesn't fix it
3. **Budget utilization pass only upgrades ONE meal** — leaving ₹70+ unspent
4. **`validateDaySync` uses RAW recipe values** (ignores `portionScale`) — so warnings are wrong
5. **No iterative optimization** — the system makes one pass and stops, even if targets are missed by 50%+
6. **Cost estimation via ingredient price matching is unreliable** — fuzzy matching misses many ingredients, falling back to `calories * 0.04` which is inaccurate

## Plan

### Step 1: Create Constraint-Based Meal Selection Engine

**New file: `src/lib/constraint-optimizer.ts`**

Replace the "pick best recipe then hope" approach with a constraint-first algorithm:

```
Input: dailyBudget, targetCal, targetProtein, targetCarbs, targetFat, mealSlots, availableRecipes
Output: { meals: PlannedMeal[], totalCal, totalProtein, totalCost, warnings[] }
```

Algorithm:
1. For each slot (breakfast/lunch/dinner/snack), compute per-slot targets using split percentages
2. For each slot, **filter recipes that can hit 80%+ of the slot's protein target** when scaled (within 0.5x-2.5x range)
3. Score remaining candidates by `|actualProtein - targetProtein| + |actualCal - targetCal| + costPenalty`
4. Pick the candidate with lowest deviation score
5. After all slots filled, calculate day totals
6. **Iterative fix**: if `dayProtein < targetProtein * 0.85`, re-run the weakest slot with `minProtein` filter raised, up to 3 iterations
7. If `dayCost < dailyBudget * 0.8` and protein is still low, increase portion scales on protein-heavy meals (up to 2.5x cap)
8. If targets still unmet after iterations, return with warnings

This replaces the current `findRecipeWithFallback` + protein post-pass + budget utilization pass with a single unified optimizer.

### Step 2: Fix `validateDaySync` to Use Scaled Values

**File: `src/lib/plan-validator.ts`** (lines 152-195)

Currently `validateDaySync` reads raw `recipe.calories` and `recipe.protein` without applying `meal.portionScale`. Fix to use `getScaledMealInfo()`:

```typescript
for (const meal of dayPlan.meals) {
  const info = getScaledMealInfo(meal);
  if (!info) { warnings.push(...); continue; }
  totalCalories += info.calories;
  totalProtein += info.protein;
  totalCost += info.cost;
}
```

Same fix needed in `validateWeeklyNutrition` (lines 201-270).

### Step 3: Fix `estimatedCost` on Recipes

**File: `src/lib/recipe-cost.ts`**

Many recipes already have `estimatedCost` set directly (the newer ones from line 1862+). But older recipes (lines 50-1811) rely on `estimateRecipeCost()` which does fuzzy ingredient matching against `price-database.ts`. When matching fails, fallback is `calories * 0.04` which gives unrealistic costs (e.g., 280cal idli = ₹11).

Fix: Add `estimatedCost` directly to the 15 most commonly selected old recipes (idli-sambar, dal-rice, egg-curry, paneer-bhurji, etc.) so cost estimation is accurate for the meals that matter most.

### Step 4: Integrate Optimizer into Generator

**File: `src/lib/meal-plan-generator.ts`**

Replace the per-day generation loop (lines 359-548) to use the new constraint optimizer:

```typescript
for (let i = 0; i < 7; i++) {
  const result = optimizeDayMeals({
    dailyBudget,
    targetCal,
    targetProtein,
    mealSlots: mealTypes,
    macroTargets,
    perMealBudget,
    availableRecipes: healthFilteredRecipes,
    excludeIds: usedByType,
    profile,
  });
  days.push({ date: dateStr, meals: result.meals });
  // Update usedByType for variety
}
```

Keep existing weekly protein balancing and batch cooking detection as post-passes.

### Step 5: Add Day-Level Status Indicators in Dashboard

**File: `src/components/MealPlanDashboard.tsx`**

The day selector chips currently show day names. Add colored dots:
- Green dot: calories within 15% AND protein within 20% AND cost within budget
- Amber dot: one metric off
- Red dot: two or more metrics off

This gives at-a-glance visibility without needing to click each day.

### Step 6: Improve Feasibility Warning with Actionable Options

**File: `src/components/MealPlanDashboard.tsx`**

When feasibility check returns `insufficient`, show two action buttons:
- "Increase to ₹{recommended}/month" — updates budget
- "Reduce protein to {achievable}g" — updates profile target

Currently the warning is text-only with no actionable path.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/constraint-optimizer.ts` | **New** — constraint-based meal selection |
| `src/lib/plan-validator.ts` | Fix `validateDaySync` and `validateWeeklyNutrition` to use scaled values |
| `src/lib/recipe-cost.ts` | Add hardcoded `estimatedCost` to top 15 old recipes |
| `src/lib/recipes.ts` | Add `estimatedCost` field to ~15 frequently used recipes |
| `src/lib/meal-plan-generator.ts` | Replace per-day loop with constraint optimizer |
| `src/components/MealPlanDashboard.tsx` | Day status dots + actionable feasibility buttons |

## Key Constraint

With ₹166/day and Indian food prices, ~120-130g protein is the realistic ceiling (heavy soya + eggs + dal). 191g protein at ₹166/day is mathematically infeasible. The system will clearly communicate this and offer alternatives.

