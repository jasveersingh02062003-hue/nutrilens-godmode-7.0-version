

## Add Budget Setup Step to Meal Planner Onboarding

### What it does
Adds a budget setup step between "mealsPerDay" and "summary" in the meal planner onboarding wizard. The step collects monthly budget, computes daily budget, and lets the user set per-meal splits. On plan generation, this data is saved to the enhanced budget settings so `generateWeekPlan` picks it up automatically.

### Current State
- `MealPlanOnboarding.tsx` has 21 steps (welcome → summary), no budget step
- `meal-plan-generator.ts` already reads per-meal budgets from `getEnhancedBudgetSettings()` (defaults to breakfast:100, lunch:150, dinner:200, snacks:50)
- `BudgetPlannerTab.tsx` has a separate `BudgetOnboarding` component for standalone budget setup
- The form already has `dailyBudget` and `currency` fields but they're never collected

### Plan (1 file: `src/components/MealPlanOnboarding.tsx`)

**Step 1: Add 'budget' to STEPS array** between 'mealsPerDay' and 'summary':
```
const STEPS = [
  ...existing steps...,
  'mealsPerDay', 'budget', 'summary',
];
```

**Step 2: Add form fields** for `monthlyBudget`, `mealSplitBreakfast`, `mealSplitLunch`, `mealSplitDinner`, `mealSplitSnacks` (default ₹100, ₹150, ₹200, ₹50).

**Step 3: Add 'budget' case in renderStep():**
- Header: "Set your food budget" with IndianRupee icon
- Monthly budget input (₹) with computed daily budget shown below (monthly / 30)
- Per-meal budget inputs: Breakfast, Lunch, Dinner, Snacks with ₹ prefix
- Daily total shown at bottom for validation
- "Skip" option for users who don't want budget constraints

**Step 4: Update `finish()` function** to save budget data:
- Call `saveBudgetSettings()` and `saveEnhancedBudgetSettings()` with the collected values
- This ensures `generateWeekPlan` picks up the per-meal budgets instead of using defaults

**Step 5: Add to stepNames map and canContinue** — budget step always allows continue (optional).

**Step 6: Update MEAL_PLANNER_MONIKA** with a budget-step message.

### What stays unchanged
- All existing steps and their content
- `meal-plan-generator.ts` (already reads budget settings)
- `BudgetPlannerTab.tsx` (standalone budget management)
- `meal-planner-store.ts` types

