

## Calorie Engine with Weight-Based Redistribution

### What Needs to Change

The current system uses **proportional redistribution based on original meal targets** (redistribute missed meal calories only). The spec requires **full remaining-calorie redistribution** across all pending meals using fixed weights based on count of remaining meals.

Key gaps:
1. **No meal slot status tracking** — meals are just entries; there's no `pending/completed/missed` state per slot
2. **Redistribution redistributes missed-meal calories only** — not the full remaining calories
3. **CalorieRing shows `goal - (eaten - burned)`** — correct formula but doesn't expose `totalAllowed`
4. **No "skip meal" action** that marks a slot as missed and triggers redistribution
5. **Activity logging doesn't trigger redistribution** of meal targets

### Plan

**File 1: `src/lib/calorie-engine.ts` (NEW)**

Create the master recalculation engine:

- `MealSlotStatus` type: `'pending' | 'completed' | 'missed'`
- `MealSlot` interface: `{ name, status, consumedKcal, targetKcal }`
- `DayState` interface: `{ totalAllowed, totalConsumed, totalBurned, remaining, slots[] }`
- `getMealSlotStatuses(log, profile)` — derives status for each of the 4 slots from actual log data (has entries → completed, time passed + no entries → auto-missed detection, else → pending)
- `recalculateDay(profile, log)` → returns `DayState` with all computed values
- `redistribute(remainingKcal, pendingSlots[])` — applies the fixed weight table:
  - 4 meals: breakfast=25%, lunch=30%, snacks=15%, dinner=30%
  - 3 meals: uses weights mapped to actual meal names (lunch=40%, snacks=20%, dinner=40%)
  - 2 meals: snacks=30%, dinner=70%
  - 1 meal: 100%
  - If remaining ≤ 0: all targets = 0
- `skipMeal(date, mealType)` — saves skip to localStorage, triggers recalc
- `getSkippedMeals(date)` — reads from localStorage

This is a pure calculation layer — no UI, no side effects beyond localStorage for skip state.

**File 2: `src/components/CalorieRing.tsx` (MODIFY)**

- Add `totalAllowed` to the display (show "of X allowed" instead of just goal)
- When burns > 0, show the expanded allowance: "Base: 1581 + Burned: 560 = 2141 allowed"
- Keep existing ring logic but use `totalAllowed` for the progress denominator

**File 3: `src/components/TodayMeals.tsx` (MODIFY)**

- Import `recalculateDay` from calorie-engine
- Replace `getAdjustedMealTarget()` calls with `dayState.slots[].targetKcal` from the engine
- Add status badges (Pending/Completed/Missed) per slot
- Add "Skip" button on pending meals
- When skip is tapped, call `skipMeal()` and refresh
- Show per-slot consumed vs target from the engine

**File 4: `src/components/CaloriesBurnedCard.tsx` (MODIFY)**

- After activity is logged/deleted, the parent `Dashboard` already calls `refreshLog()` which re-renders everything. The engine will automatically recalculate targets. No logic change needed — just ensure `TodayMeals` reads from the engine on every render.

**File 5: `src/pages/Dashboard.tsx` (MODIFY)**

- Import `recalculateDay` and pass `dayState` to `CalorieRing` and `TodayMeals` instead of raw totals
- Pass `totalAllowed` to CalorieRing as the goal (replacing `profile.dailyCalories`)

### What Stays Unchanged
- All existing store functions (`addMealToLog`, `addActivity`, etc.)
- Redistribution service (kept for backward compat — the new engine runs alongside)
- Monica chat, system prompt, edge functions
- All other dashboard cards, macro cards, water tracker
- Budget, supplements, onboarding

### Test Case (from spec)
Base = 1581, lunch eaten = 709, burn = 560
- totalAllowed = 1581 + 560 = 2141
- remaining = 2141 - 709 = 1432
- Pending = snacks + dinner (2 meals)
- snacks target = 1432 × 0.3 = 430
- dinner target = 1432 × 0.7 = 1002

