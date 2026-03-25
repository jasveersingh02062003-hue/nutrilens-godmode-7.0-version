

## Smart Calorie Correction Engine — Implementation Plan

### Overview
Replace the rigid daily recovery system (`meal-recovery.ts`) with a rolling "calorie bank" that spreads surplus corrections over multiple days, partially recovers deficits, locks protein, and communicates adjustments supportively. Add a daily balance history for weekly/monthly views.

### New Files

**1. `src/lib/calorie-correction.ts`** — Core engine

- **Data model** in localStorage (`nutrilens_calorie_bank`):
  ```
  { calorieBank, adjustmentDaysRemaining, adjustmentPerDay, lastProcessedDate, dailyBalances: [{date, diff}] }
  ```
- `updateCalorieBank(dailyLog, profile)` — Computes `actual - originalTarget`, updates bank, appends to `dailyBalances` array (last 30 days).
- `getAdjustedDailyTarget(profile)` — Returns corrected target:
  - Surplus (bank > 0): spread over 4 days, cap at 20% reduction, floor at 80%.
  - Deficit (bank < 0): recover 40%, cap at 15% boost, ceiling at 115%.
  - Adaptive: consecutive surplus days extend window up to 7 days.
- `getProteinTarget(profile)` — Always returns `profile.dailyProtein` (never reduced).
- `processEndOfDay(profile)` — On day rollover, decrement remaining days, recalc if needed.
- `getCalorieBankSummary()` — Returns `{ bank, status, message }`.
- `getDailyBalances()` — Returns last 30 days of `{ date, diff }` for the progress view.
- `getCorrectionMessage()` — Returns user-friendly toast text (surplus/deficit/null).

**2. `src/lib/meal-adjustment.ts`** — Meal-level portion adjustments

- `adjustMealPlan(meals, adjustedTarget, proteinTarget)` — Modifies existing day's meals:
  - If reducing calories: shrink portions of lowest-PES items first (min 0.5x), suggest swaps if needed.
  - If increasing: grow portions of highest-PES items (max 1.5x), add small high-protein items.
  - Protein lock: after calorie adjustment, if protein falls short, boost high-protein items.
  - Returns `{ adjustedMeals, changes: string[] }` (human-readable change list).

### Modified Files

**3. `src/lib/calorie-engine.ts`** — Single-line change
- Line 126: Replace `profile?.dailyCalories || 1600` with `getAdjustedDailyTarget(profile)`.
- This propagates the adjusted target to CalorieRing, slot redistribution, and all downstream UI.

**4. `src/pages/Dashboard.tsx`** — Badge, toast, day rollover
- Replace `getRecoveredTargets` import with `processEndOfDay`, `getAdjustedDailyTarget`, `getCorrectionMessage` from calorie-correction.
- In startup useEffect: call `processEndOfDay(profile)` instead of `getRecoveredTargets`. Show supportive toast via `getCorrectionMessage()`.
- Replace the "Meal Recovery Banner" (lines 249-260) with an "Adjusted for balance" badge (⚖️) shown when adjusted target differs from original.
- MacroCard protein goal: use `getProteinTarget(profile)` (same value, but semantically correct).

**5. `src/components/MealDetailSheet.tsx`** — Update bank on mutations
- After `handleAddItem`, `handleDeleteItem`, `handleUpdateQty`: call `updateCalorieBank(getDailyLog(), profile)`.

**6. `src/pages/LogFood.tsx`** — Update bank after manual logging
- After saving a meal, call `updateCalorieBank(getDailyLog(), profile)`.

**7. `src/lib/meal-plan-generator.ts`** — Use adjusted target
- In `scoreRecipe` and wherever `profile.dailyCalories` is used for daily plan generation, replace with `getAdjustedDailyTarget(profile)`.

**8. `src/pages/Progress.tsx`** — Calorie Balance History section
- Add a new "Calorie Balance" card between "Weekly Overview" and existing sections.
- Uses `getDailyBalances()` to render a horizontal bar chart of daily surplus/deficit (green bars for surplus, red for deficit) for last 30 days.
- Shows summary text: "Your plan auto-adjusted to keep you aligned."
- Shows current bank status as a balance meter (capped visual at ±2000 kcal).

### What Gets Replaced
- `meal-recovery.ts` functions (`getRecoveredTargets`, `calculateRecoveryAdjustment`) are no longer called. File stays but becomes unused.
- The recovery banner in Dashboard is replaced by the lighter "Adjusted for balance" badge.

### Key Rules
- Target: min 80%, max 115% of original
- Surplus correction: spread over 4 days (up to 7 if consecutive), capped at 20%/day
- Deficit recovery: 40% partial, capped at 15%
- Protein: constant, never reduced
- Toast language: supportive, no guilt, no raw numbers
- All state in one localStorage key + dailyBalances array

