

# Wire Budget Validation to Real User Goals

## Problem
Line 350 in `BudgetPlannerTab.tsx` calls `validateBudgetVsGoals(m, 2000, 80)` with **hardcoded** 2000 kcal and 80g protein instead of the user's actual goals from their profile. The Daily Plan Card and Dashboard also don't show budget feasibility warnings. When goals change in EditProfileSheet, no budget validation runs.

## Changes

### 1. Fix BudgetPlannerTab — Use Real Goals
**File:** `src/components/BudgetPlannerTab.tsx` (line 350)
- The `useUserProfile()` hook is already imported (line 20). Access `profile` from it.
- Replace `validateBudgetVsGoals(m, 2000, 80)` with `validateBudgetVsGoals(m, profile?.dailyCalories || 2000, profile?.dailyProtein || 80)`
- In the AI budget suggestion flow, also validate the AI-suggested amount against real goals and show warning if insufficient
- Below the validation warning, add a line showing "Recommended minimum: ₹{validation.minMonthly}/month" when severity is not `'ok'`

### 2. Add Budget Warning to Daily Plan Card
**File:** `src/components/DailyPlanCard.tsx`
- Import `validateBudgetVsGoals` and `getUnifiedBudget` from `budget-engine.ts`
- After the 3-column metrics grid (line 69), compute validation using profile's actual calories/protein
- If `severity === 'tight'`: show amber banner "Budget is tight — high-PES meals prioritized"
- If `severity === 'insufficient'`: show red banner "Budget too low for your goals. Recommended: ₹X/month"

### 3. Add Budget Warning Banner to Dashboard
**File:** `src/pages/Dashboard.tsx`
- Import `validateBudgetVsGoals` and `getUnifiedBudget`
- After the DailyPlanCard render (~line 294), compute validation against `profile.dailyCalories` and `profile.dailyProtein`
- If `severity === 'insufficient'`, show a dismissible banner with the warning text and recommended minimum
- Use `isDailyHidden('budget_warning')` / `setDailyHidden('budget_warning')` for once-per-day dismissal

### 4. Validate Budget on Goal Changes
**File:** `src/components/EditProfileSheet.tsx`
- Import `validateBudgetVsGoals` and `getUnifiedBudget` from `budget-engine.ts`
- In `handleSave()` (line 102), after `updateProfile(...)`, run validation:
  ```
  const unified = getUnifiedBudget();
  const validation = validateBudgetVsGoals(unified.monthly, decision.targetCalories, decision.targetProtein);
  if (validation.severity === 'insufficient') {
    toast.warning(validation.warning);
  }
  ```
- This ensures that when a user switches from fat loss to muscle gain (increasing calorie/protein needs), they're immediately warned if their budget can't support it

## What This Fixes
- ₹2000/month + muscle gain (3000 kcal, 160g protein) → clear warning with recommended minimum
- ₹5000/month + fat loss (1500 kcal, 100g protein) → confirmed sufficient
- Warnings appear consistently: budget setup, daily plan popup, dashboard, and on goal change

