

# Fix Remaining Budget Bypass Points — Complete Unified Wiring

## Problem
The budget engine (`budget-engine.ts`) exists with correct math, but **4 components still bypass it** and read raw `enhanced.perMeal` or `budgetSettings.perMeal` directly from localStorage. This means they show the old impossible numbers (₹900 breakfast on a ₹5000/month budget) instead of the correctly derived values.

## Files That Still Bypass the Budget Engine

| File | What it does wrong |
|---|---|
| `src/components/TodayMeals.tsx` (line 191-193) | Reads `enhanced.perMeal` directly for per-meal budget display |
| `src/components/TodayMealPlan.tsx` (lines 49, 123-129) | Uses `enhanced.perMeal` in `getMealBudget()` function |
| `src/components/MealPlanOnboarding.tsx` (lines 81, 183, 349) | 3 places read `budgetSettings.perMeal` with hardcoded fallback `{ breakfast: 100, lunch: 150, dinner: 200, snacks: 50 }` |

## Changes

### 1. Fix `TodayMeals.tsx` — Use Unified Budget
- Replace `getEnhancedBudgetSettings()` call (line 191) with `getUnifiedBudget()`
- Change `enhanced.perMeal[slotKey]` to `unified.perMeal[slotKey]`
- Import `getUnifiedBudget` from `budget-engine.ts`

### 2. Fix `TodayMealPlan.tsx` — Use Unified Budget
- Replace `getEnhancedBudgetSettings()` (line 49) with `getUnifiedBudget()`
- Rewrite `getMealBudget()` (lines 123-129) to return `unified.perMeal[slotKey]`
- Import `getUnifiedBudget` from `budget-engine.ts`

### 3. Fix `MealPlanOnboarding.tsx` — Use Unified Budget
- All 3 places (lines 81, 183, 349) that read `budgetSettings.perMeal` with hardcoded fallbacks must be replaced with `getUnifiedBudget()` calls
- The daily budget should come from `unified.daily`, not summing raw perMeal values
- The per-meal display should show `unified.perMeal.breakfast`, etc.
- Add budget feasibility validation in the onboarding summary step — if budget is insufficient for the user's computed goals, show a warning with recommended minimum

### 4. Add Budget Feasibility Warning in MealPlanOnboarding
- After computing `decision.targetCalories` and `decision.targetProtein`, call `validateBudgetVsGoals(unified.monthly, decision.targetCalories, decision.targetProtein)`
- If `severity === 'insufficient'`, show a red warning in the summary: "Your budget of ₹X/month may not support your goal. Recommended: ₹Y/month"
- If `severity === 'tight'`, show an amber note: "Budget is tight — meal plan will prioritize affordable high-protein foods"

## What This Fixes
- Every screen that shows per-meal budgets will derive them from `monthly / daysInMonth × splitPct%`
- ₹5000/month will consistently show ~₹33 breakfast, ~₹50 lunch, ~₹58 dinner, ~₹25 snacks everywhere
- No more impossible ₹900/₹1500/₹1750 per-meal numbers
- Budget feasibility warnings appear during meal plan onboarding, not just in budget setup

## Technical Detail
All 3 files need only a simple import swap and variable rename. The `getUnifiedBudget()` function already returns the correctly computed `perMeal` object with the same shape (`{ breakfast, lunch, dinner, snacks }`), so downstream code just works.

