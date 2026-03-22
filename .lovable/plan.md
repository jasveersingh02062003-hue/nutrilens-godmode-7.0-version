

## Budget Engine & Meal Planner Enhancement

### Current State

The app already has **extensive** budget infrastructure:
- ✅ `BudgetPlannerTab` (1496 lines) with onboarding, manual/AI budget setup, meal-level budgets, pantry tracking
- ✅ `BudgetSummaryCard` on dashboard showing daily spend vs budget
- ✅ `expense-store.ts` with per-meal cost tracking, categories, manual expenses
- ✅ `budget-service.ts` with period summaries, nutritional economics
- ✅ `budget-alerts.ts` with threshold alerts, overspend warnings
- ✅ `recipe-cost.ts` with ingredient-based cost estimation
- ✅ `TodayMeals` already shows ₹cost per meal slot
- ✅ Meal entries already have `cost` and `source.category` fields
- ✅ Recipe database with 1500+ lines of Indian recipes (but missing `cost`, `suitable_for`, `avoid_for`, `nutrition_score`)

### Actual Gaps to Fill

| Feature | Status | What's Missing |
|---------|--------|----------------|
| Recipe cost + health filtering | ❌ | Recipes lack `cost`, `suitable_for`, `avoid_for`, `nutrition_score` fields. No `getRecipesForMeal()` function |
| Budget-aware meal suggestions | ❌ | BudgetPlannerTab doesn't suggest meals filtered by remaining budget + health conditions |
| Per-meal budget display in TodayMeals | ⚠️ Partial | Shows ₹cost but not ₹cost/₹budget format |
| Overspend redistribution | ❌ | No logic to reduce remaining days' budget after overspend |
| Budget ring on dashboard | ❌ | Only a bar in BudgetSummaryCard, no circular ring |

### Plan

**File 1: `src/lib/recipes.ts` — Add cost + health metadata to Recipe interface**

- Add optional fields to `Recipe`: `estimatedCost?: number`, `suitableFor?: string[]`, `avoidFor?: string[]`, `nutritionScore?: number`
- Add a `getEnrichedRecipe(recipe)` function that auto-computes `estimatedCost` using `estimateRecipeCost()` from `recipe-cost.ts` and assigns a `nutritionScore` (protein-per-calorie weighted)

**File 2: `src/lib/meal-suggestion-engine.ts` (NEW) — Budget + health aware recipe filtering**

- `getRecipesForMeal(mealType, maxCost, profile)`:
  - Filter recipes by `mealType`
  - Filter by cost ≤ maxCost (using `estimateRecipeCost`)
  - Filter by health conditions (check `avoidFor` and `evaluateFoodForUser` from logic-engine)
  - Filter by diet preference (veg/vegan/non-veg from profile)
  - Sort by nutrition score
  - Return top 5
- `getRemainingMealBudget(mealType)`: computes per-meal budget minus already-spent for that slot today

**File 3: `src/lib/budget-service.ts` — Add overspend redistribution**

- `adjustBudgetAfterOverspend(overspend, daysRemaining)` → returns daily reduction amount
- `getDaysRemainingInPeriod()` → computes days left in current week/month

**File 4: `src/components/TodayMeals.tsx` — Show per-meal budget**

- For each meal slot, compute per-meal budget from enhanced budget settings
- Display as `₹{spent}/₹{budget}` next to the existing calorie display
- If over budget for that meal, show orange/red text

**File 5: `src/components/BudgetSummaryCard.tsx` — Add circular ring**

- Replace the existing progress bar with a small SVG circular ring (similar to CalorieRing but smaller)
- Green < 80%, orange 80-100%, red > 100%
- Show `₹spent / ₹daily` inside

**File 6: `src/components/BudgetPlannerTab.tsx` — Add meal suggestion section**

- Add a "Suggested Meals" section after the budget settings
- For each pending meal slot, call `getRecipesForMeal()` and show top 3 recipes
- Each recipe card shows: name, emoji, calories, ₹cost, nutrition score
- "Log This" button: logs the recipe as a meal with cost and category="home", triggers budget + calorie recalc

### What Stays Unchanged
- All existing onboarding, calorie engine, redistribution, activity tracking
- Existing BudgetPlannerTab structure (only adding a section)
- Store types (MealEntry already has cost/source)
- BottomNav (Planner tab already exists)

