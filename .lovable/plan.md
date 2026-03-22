

## Upgrade Meal Generator with Budget-First Constraint Satisfaction

### Already Implemented
Everything the user described is already present in the codebase:

| Feature | Status | Location |
|---------|--------|----------|
| Recipe filtering by cost, health, diet, cooking skill | ✅ | `meal-suggestion-engine.ts` `getRecipesForMeal()` |
| Scoring by proteinPerRupee + satiety + nutrition + remaining cal/protein | ✅ | `meal-suggestion-engine.ts` lines 84-110 |
| Budget curve multiplier (day-of-month) | ✅ | `budget-service.ts` `getBudgetCurveMultiplier()` |
| Adjusted daily budget with overspend correction | ✅ | `budget-service.ts` `getAdjustedDailyBudget()` |
| Per-meal budget cascade | ✅ | `budget-service.ts` `cascadeMealBudget()` |
| Survival mode (₹100/day cap) | ✅ | `budget-service.ts` `activateSurvivalMode()` |
| Dual-sync insight (cal vs budget) | ✅ | `budget-service.ts` `getDualSyncInsight()` |
| Rolling next-meal suggestion | ✅ | `NextMealCard.tsx` using `getRecipesForMeal()` |
| Weekly plan generation with fallback relaxation | ✅ | `meal-plan-generator.ts` `generateWeekPlan()` |
| Fallback recipe selection (progressive relaxation) | ✅ | `meal-plan-generator.ts` `findRecipeWithFallback()` |
| 128 recipes with satiety, cost, health tags | ✅ | `recipes.ts` |

### What's Missing

The only gap is that `generateWeekPlan()` in `meal-plan-generator.ts` doesn't apply the budget curve or use the satiety-based ranking. It uses random selection (`pickRandom`) instead of the scoring algorithm.

### Plan (1 file changed)

**File: `src/lib/meal-plan-generator.ts`**

- Replace `pickRandom(results)` inside `findRecipeWithFallback` with a scored selection using the same ranking formula from `meal-suggestion-engine.ts`:
  ```
  rankScore = (proteinPerRupee * 0.3) + (satietyScore/5 * 0.3) + (nutritionScore/10 * 0.2) + cost_fit * 0.1 + protein_fit * 0.1
  ```
- In `generateWeekPlan()`, apply `getBudgetCurveMultiplier(dayOfMonth)` to per-meal calorie budgets
- Add cost constraint: pass `maxCost` from per-meal budget into `findRecipeWithFallback`
- Add protein post-optimization: after generating a day's meals, if total protein < target * 0.9, swap the lowest-protein meal for a higher-protein alternative (same logic as user's spec)

### What Stays Unchanged
- `meal-suggestion-engine.ts` (already complete)
- `budget-service.ts` (already has curve, cascade, survival, dual-sync)
- `NextMealCard.tsx`, Dashboard, BudgetPlannerTab
- Recipe database, all UI components

