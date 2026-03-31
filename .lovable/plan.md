

# Unified Budget Sync — Fix Budget/Meal/Dashboard Inconsistency

## Problem
Monthly budget ₹5000 produces per-meal budgets of ₹900+₹1500+₹1750+₹350 = ₹4500 **per day** because per-meal values are stored independently and never validated against the monthly total. This affects meal planner, dashboard, daily plan card, and progress — all showing impossible numbers.

## Root Cause
`EnhancedBudgetSettings.perMeal` in `budget-alerts.ts` stores raw user-entered values that are never constrained to the monthly budget. The meal planner (`meal-plan-generator.ts` line 342) and suggestion engine use these raw values directly.

## Solution

### 1. Create `src/lib/budget-engine.ts` — Single Source of Truth

New central module that all other files import from:

- `computeDailyBudget(monthlyBudget)` → monthly / daysInMonth
- `computePerMealBudgets(dailyBudget, splitPcts)` → derived per-meal amounts
- `DEFAULT_MEAL_SPLIT = { breakfast: 20, lunch: 30, dinner: 35, snacks: 15 }` (percentages)
- `validateBudgetVsGoals(monthlyBudget, dailyCalories, dailyProtein)` → returns `{ feasible, minMonthly, warning }` using cheapest protein source (soya ≈ ₹0.23/g) and cheapest calorie source (rice ≈ ₹0.04/kcal)
- `getUnifiedBudget(profile)` → reads monthly from `BudgetSettings`, computes daily + per-meal; this is the **one function** everything calls

### 2. Update `src/lib/budget-alerts.ts`

- Change `EnhancedBudgetSettings.perMeal` to store **split percentages** (not absolute amounts)
- Default: `{ breakfast: 20, lunch: 30, dinner: 35, snacks: 15 }`
- Remove hardcoded fallback `{ breakfast: 100, lunch: 150, dinner: 200, snacks: 50 }`
- All functions that read `perMeal` now call `getUnifiedBudget()` instead

### 3. Update `src/components/BudgetPlannerTab.tsx` — Budget Setup UI

- When user enters monthly budget, immediately show computed daily and per-meal amounts
- Per-meal inputs become **percentage sliders** (or editable amounts that auto-adjust percentages, keeping sum = 100%)
- Add validation banner: if budget is too low for goals, show warning with recommended minimum
- On save: store monthly budget in `BudgetSettings`, store split percentages in `EnhancedBudgetSettings`
- AI recommendation mode: also validate suggested budget against user's calorie/protein goals

### 4. Update `src/lib/meal-plan-generator.ts`

- Line 341-342: Replace `getEnhancedBudgetSettings().perMeal` with `getUnifiedBudget(profile).perMeal`
- Line 375: Daily budget computed from unified source
- Line 378: Per-meal budget from unified computed values

### 5. Update `src/lib/meal-suggestion-engine.ts`

- `getRemainingMealBudget()`: Use `getUnifiedBudget()` instead of raw `EnhancedBudgetSettings.perMeal`
- `getRecipesForMeal()`: Budget filter uses derived per-meal budget

### 6. Update `src/lib/daily-plan-message.ts`

- Import `getUnifiedBudget` and use computed daily budget for the daily plan card
- Per-meal budget in each slot comes from unified computation

### 7. Update `src/lib/budget-service.ts`

- `getAdjustedDailyBudget()`: Derive from unified monthly budget, not from raw `perMeal` sum
- `getDualSyncInsight()`: Use unified daily budget

### 8. Update `src/lib/plan-validator.ts`

- All references to `perMeal` fallback `{ breakfast: 100, ... }` replaced with `getUnifiedBudget()`

### 9. Update `src/components/MealPlanDashboard.tsx`

- `getMealBudget()`: Use `getUnifiedBudget()` for per-meal limits shown on meal cards

### 10. Update Dashboard & Profile Budget Display

- Dashboard budget ring: Use `getUnifiedBudget().daily` as the denominator
- Profile budget card: Show monthly → daily → per-meal breakdown consistently

## Budget Validation Intelligence

When budget is set or goals change:
- Compute minimum daily cost: `proteinTarget × 0.23 + (calorieTarget - proteinTarget×4) × 0.04`
- If daily budget < minimum: show warning "Your budget of ₹X/month (₹Y/day) is too low for your goals. Minimum recommended: ₹Z/month"
- If tight (within 1.5×): show info "Budget is tight — meals will prioritize high-PES foods"

## Data Migration

- On first load with old `perMeal` absolute values: detect if sum > daily budget, convert to percentages automatically
- Existing `BudgetSettings.monthlyBudget` remains the source; per-meal becomes derived

## What Changes for Users

- Monthly ₹5000 → daily ₹167 → breakfast ₹33, lunch ₹50, dinner ₹58, snacks ₹25
- All screens show these consistent numbers
- Warning if budget can't support their nutrition goals
- Meal planner only suggests recipes within actual per-meal budget

