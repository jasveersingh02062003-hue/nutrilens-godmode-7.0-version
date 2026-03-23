

## Sync Budget Planner & Meal Planner Flow

### What changes

When the user taps "Create Meal Plan" and budget onboarding hasn't been completed, redirect them to the Budget tab first. After budget onboarding completes, auto-switch to the Meal Plan tab. Remove the duplicate budget step from MealPlanOnboarding and instead read budget data from the shared localStorage.

### Changes (4 files)

**File 1: `src/components/BudgetPlannerTab.tsx`**
- Add optional `onOnboardingComplete` prop to `BudgetPlannerTab`
- On line 1400, where `BudgetOnboarding` renders, pass a wrapped callback that calls both `refresh()` and `onOnboardingComplete?.()`

**File 2: `src/components/MealPlannerTabs.tsx`**
- Add optional `onBudgetComplete?: () => void` prop to `MealPlannerTabsProps`
- Pass it through to `<BudgetPlannerTab onOnboardingComplete={onBudgetComplete} />`

**File 3: `src/pages/MealPlanner.tsx`**
- Import `getEnhancedBudgetSettings` from `@/lib/budget-alerts`
- In the "Create Meal Plan" button handler (line ~406), check `getEnhancedBudgetSettings().onboardingDone`. If false, set `activeTab` to `'Budget'` and show `toast('Set your budget first')` instead of proceeding to onboarding
- Add `handleBudgetComplete` callback: sets `activeTab` to `'Meal Plan'`, sets `step` to `'onboarding'`, shows toast "Budget set! Now let's plan your meals"
- Pass `onBudgetComplete={handleBudgetComplete}` to `MealPlannerTabs`

**File 4: `src/components/MealPlanOnboarding.tsx`**
- Remove `'budget'` from `STEPS` array (line 18)
- Remove budget-related form fields (`monthlyBudget`, `mealSplitBreakfast`, etc.) from initial state
- Remove the budget `renderStep` case
- In `finish()`, read budget from `getEnhancedBudgetSettings()` instead of form fields — replace lines 122-140 with reading from the already-saved enhanced settings
- In the `summary` step, show a read-only "Budget" row displaying the current per-meal budgets from `getEnhancedBudgetSettings()` with a note "Edit in Budget tab"

### Flow after changes
```text
User opens Planner → sees tabs (Budget, Meal Plan, Groceries, Recipes)
  ├─ Taps "Create Meal Plan" in Meal Plan tab
  │   ├─ Budget NOT done → redirected to Budget tab → BudgetOnboarding
  │   │   └─ Completes → auto-switch to Meal Plan tab → MealPlanOnboarding
  │   └─ Budget done → MealPlanOnboarding (no budget step, reads existing budget)
  └─ Both share same localStorage keys (expense-store + budget-alerts)
```

### What stays unchanged
- `BudgetOnboarding` UI and logic (untouched)
- `meal-plan-generator.ts` (already reads `getEnhancedBudgetSettings`)
- All calculation engines
- All other onboarding steps in MealPlanOnboarding

