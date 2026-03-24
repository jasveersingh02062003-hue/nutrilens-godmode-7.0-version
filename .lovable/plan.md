

## Real-Time Budget Tracker (Active Decision Engine)

### Problem
Budget alerts only run on Dashboard load (via `checkBudgetAlerts()`). After logging a meal in LogFood or CameraHome, no budget check happens — the user gets no warning about overspending until they return to the dashboard.

### What We'll Build

A centralized `checkBudgetAfterMeal()` function that fires immediately after every meal log, shows threshold-based toasts, auto-adjusts future daily budgets on overspend, and suggests cheap alternatives. Plus a reactive alert banner on the Dashboard.

### Changes (4 files)

**File 1: Update `src/lib/budget-service.ts`** — Add active intervention engine

- Add `checkBudgetAfterMeal(mealCost: number)` — the core function called after every meal log:
  - Reads today's expenses via `getExpensesForDate(today)`, sums total spent today
  - Computes `ratio = spentToday / adjustedDailyBudget`
  - Returns `{ level: 'ok' | 'warning' | 'overspend' | 'overspend_severe', message, suggestion?, adjustedBudget? }`
  - At 80%: warning message with remaining amount
  - At 100%: overspend message + calls `adjustFutureBudget()` which recomputes `adjustedDailyBudget` for remaining days
  - At 120%: severe + cheap meal suggestion from `getCheapMealSuggestion()` (reads top PES food from `pes-engine.ts` under remaining budget)
- Add `getCheapMealSuggestion(maxCost: number)` — returns cheapest high-PES meal name + cost from the food database
- Add `getLatestBudgetAlert()` / `setLatestBudgetAlert()` — stores the latest alert in localStorage so Dashboard can read it reactively

**File 2: Update `src/pages/LogFood.tsx`** — Trigger budget check after meal save

- After `addMealToLog(meal)` (line ~130), call `checkBudgetAfterMeal(mealCost?.amount || 0)`
- Based on returned level: show appropriate toast via `toast.warning()` / `toast.error()`
- Import `checkBudgetAfterMeal` from budget-service

**File 3: Update `src/pages/CameraHome.tsx`** — Same trigger after camera meal save

- After `addMealToLog(meal)` (line ~513), call `checkBudgetAfterMeal(finalCost?.amount || 0)`
- Show toast based on level

**File 4: Update `src/pages/Dashboard.tsx`** — Reactive alert banner

- Add a `budgetAlert` state that reads from `getLatestBudgetAlert()` on mount and on the 2-second refresh interval
- Render an alert banner below the BudgetSummaryCard when alert exists:
  - Warning (80%): orange banner with remaining amount
  - Overspend: red banner with adjusted daily budget info
  - Severe: red banner + cheap meal suggestion
- Clear alert when user dismisses it

### Alert Logic
```text
After meal logged with cost:
  ratio = todaySpent / adjustedDailyBudget

  < 0.8  → no alert
  ≥ 0.8  → ⚠️ "80% used. Keep next meal under ₹{remaining}"
  ≥ 1.0  → 🚫 "Budget reached. Remaining days: ₹{newDaily}/day"
           → recalculate adjustedDailyBudget
  ≥ 1.2  → ⛔ "Overspent! Try {cheapMeal} (₹{cost})"
           → recalculate + suggest cheap meal
```

### What stays unchanged
- `checkBudgetAlerts()` in budget-alerts.ts (period-level alerts, still used elsewhere)
- BudgetSummaryCard ring colors (already reactive)
- All existing budget, expense, and meal logging logic
- SupplementLogSheet meal logging (low priority, supplements rarely have cost)

