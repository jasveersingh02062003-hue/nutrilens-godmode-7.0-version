

# Daily Plan Card — Implementation Plan

## What It Does
A card that appears at the top of the Dashboard on first open each day. Shows the user's adjusted calorie target, protein goal, remaining budget, and per-meal breakdown with example suggestions. Dismissible once per day via `isDailyHidden`/`setDailyHidden` from `daily-visibility.ts`.

## Files to Create

### 1. `src/lib/daily-plan-message.ts`
Generates the daily plan data object by composing existing engines:
- `getAdjustedDailyTarget()` from `calorie-correction.ts` for today's calorie target
- `getProteinTarget()` from `calorie-correction.ts` for protein
- `getBudgetSummary()` from `budget-service.ts` for remaining budget
- `getMealTarget()` from `meal-targets.ts` for per-meal calorie/protein splits
- `getRecipesForMeal()` from `meal-suggestion-engine.ts` for one suggestion per slot
- `getRemainingMealBudget()` from `meal-suggestion-engine.ts` for per-meal budget

Returns: `{ adjustedCalories, proteinTarget, remainingBudget, currency, meals: [{ type, targetCal, targetProtein, budget, suggestion? }] }`

### 2. `src/components/DailyPlanCard.tsx`
Card component with:
- Greeting header using `getGreeting()` from `nutrition.ts`
- Summary row: adjusted calories, protein, budget remaining
- 4 meal rows (breakfast/lunch/snack/dinner) each showing target kcal, budget, and a suggestion name if available
- "View Full Plan" button navigating to `/planner`
- Dismiss (X) button calling `setDailyHidden('daily_plan')`
- Uses existing `card-elevated` styling and `animate-fade-in`

## Files to Modify

### 3. `src/pages/Dashboard.tsx`
- Import `DailyPlanCard` and `isDailyHidden` from `daily-visibility.ts`
- Add state: `showDailyPlan` initialized from `!isDailyHidden('daily_plan')`
- Render `<DailyPlanCard>` after the header section (line ~287), before the planner banner
- On dismiss, call `setDailyHidden('daily_plan')` and hide the card

## Technical Notes
- Uses `daily-visibility.ts` for once-per-day logic (same pattern as other daily cards) — no new localStorage key pattern needed
- All data comes from existing engines; no new computation logic
- Budget uses `getBudgetSummary()` which already computes spent vs remaining for the current period
- Meal suggestions use `getRecipesForMeal()` with budget filter — returns top-ranked recipe name

