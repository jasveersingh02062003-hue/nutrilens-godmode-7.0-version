

## Fix: Wire All Disconnected Features Together

### Problem
Several features were built but never connected to the rest of the system. Specifically:

1. **Meal Recovery** (`meal-recovery.ts`) — `getRecoveredTargets()` and `calculateRecoveryAdjustment()` exist but are never imported or called anywhere. Yesterday's missed protein or calorie overshoot has zero effect on today.

2. **Portion Engine** (`portion-engine.ts`) — `calculatePortions()` exists but is never used. Meal plan shows recipes without scaled quantities.

3. **Weekly Auto-Fix doesn't regenerate plan** — `autoFixNextWeek()` adjusts profile targets (protein, calories, budget) but never regenerates the actual week plan or grocery list. The user clicks "Fix Next Week Plan" and gets toasts, but the meal plan stays the same.

4. **Swap doesn't refresh grocery list** — After applying a swap in `SwapSimulatorSheet`, the plan is saved but `MealPlannerTabs`'s `GroceriesTab` uses a `useMemo` on the initial plan prop, so it doesn't re-render with updated ingredients.

5. **Profile sync after auto-fix** — `autoFixNextWeek()` writes directly to `localStorage` with `JSON.stringify` instead of using `saveProfile()` from store, so `UserProfileContext` never picks up the changes.

### Changes (5 files)

**File 1: Update `src/pages/Dashboard.tsx`** — Wire meal recovery

- Import `getRecoveredTargets` from `meal-recovery.ts`
- In the existing mount `useEffect`, call `getRecoveredTargets(profile.dailyCalories, profile.dailyProtein)`
- Store the `recovery` result in state
- If recovery exists, show a small info banner: e.g. "Today's protein boosted +20g (yesterday was short)" — reuse the existing banner pattern (similar to budget alert banner)
- Pass adjusted targets to `CalorieRing` and `MacroCard` so the rings reflect recovery-adjusted goals

**File 2: Update `src/components/MealPlanDashboard.tsx`** — Wire portion engine to meal cards

- Import `calculatePortions` from `portion-engine.ts`
- In the meal card rendering, call `calculatePortions(recipe, mealTargetCalories)` where `mealTargetCalories` comes from the planner profile's per-meal split
- Display scaled ingredient quantities below each meal card (e.g. "Rice: 80g · Dal: 150g · Oil: 5g") in small muted text
- Only show portions when recipe has ingredients

**File 3: Update `src/lib/weekly-feedback.ts`** — Auto-fix must regenerate plan + use proper save

- In `autoFixNextWeek()`: after adjusting targets, import and call `generateWeekPlan()` + `saveWeekPlan()` to actually regenerate the meal plan
- Replace direct `localStorage.setItem('nutrilens_profile', ...)` with `saveProfile()` from store so `UserProfileContext` stays in sync
- After regenerating plan, the grocery list auto-updates since `GroceriesTab` reads from the saved plan

**File 4: Update `src/components/WeeklyFeedbackCard.tsx`** — Refresh profile after fix

- After `autoFixNextWeek()` succeeds, call `refreshProfile()` from `useUserProfile()` context so Dashboard picks up new targets immediately
- Add a note in the success toast: "Plan regenerated for next week"

**File 5: Update `src/pages/MealPlanner.tsx`** — Grocery list refreshes after swap

- After `performSwap()` saves the updated plan, call `setPlan({...updated})` (already done) — but also ensure `MealPlannerTabs` receives the latest `plan` prop so `GroceriesTab`'s `useMemo` recomputes
- This is already wired correctly (plan state updates trigger re-render). Verify `MealPlannerTabs` receives `plan` as prop — if `GroceriesTab` reads from `getWeekPlan()` instead of props, change it to use the prop

### Sync Verification Checklist
```text
Log meal → budget ring updates     ✅ Already wired (checkBudgetAfterMeal)
Log meal → cloud sync              ✅ Already wired (syncDailyLogToCloud)
Swap meal → plan updates           ✅ Already wired (performSwap)
Swap meal → grocery list updates   ⚠️ Fix: ensure GroceriesTab re-reads plan
Recovery → today's targets         ❌ Fix: wire getRecoveredTargets in Dashboard
Portions → meal card display       ❌ Fix: wire calculatePortions in MealPlanDashboard
Auto-fix → regenerate plan         ❌ Fix: call generateWeekPlan in autoFixNextWeek
Auto-fix → profile context sync    ❌ Fix: use saveProfile + refreshProfile
```

### What stays unchanged
- Onboarding flow, food database, recipe system
- Budget service, expense store, PES engine
- Survival kit, swap engine logic
- Cloud sync, auth context

