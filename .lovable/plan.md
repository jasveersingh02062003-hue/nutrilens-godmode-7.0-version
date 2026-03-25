

## Smart Calorie Correction Engine — Production Hardening Plan

### Overview
This plan adds the missing production layers to the existing calorie correction engine: meal locking, user behavior modes, adherence tracking, failure handling, confidence scoring, special day types, balance streaks, time-based cutoff, and a standardized API contract. The core engine (`calorie-correction.ts`) and meal adjustment (`meal-adjustment.ts`) already work — this extends them.

### Priority 1: Data Model Extensions

**`src/lib/calorie-correction.ts`** — Extend `CalorieBankState` with:
- `correctionMode: 'aggressive' | 'balanced' | 'flexible'` (default `'balanced'`)
- `autoAdjustMeals: boolean` (default `true`)
- `dayCutoffHour: number` (default `3`)
- `specialDays: Record<string, 'normal' | 'cheat' | 'recovery' | 'fasting'>`
- `balanceStreak: number` (consecutive days within ±100 kcal)

Update `loadState()` to default these new fields for backward compatibility.

### Priority 2: Meal Locking (3 functions)

**`src/lib/meal-adjustment.ts`** — Add meal locking logic:
- Add `status?: 'locked' | 'flexible'` to the adjustment flow. Logged meals (those already in `dailyLog.meals`) are treated as locked. Only future/unlogged meal slots are adjustable.
- Modify `adjustMealPlan()` to accept a `lockedCalories` parameter — the engine subtracts locked calories from the adjusted target and only modifies flexible items.

### Priority 3: User Behavior Modes

**`src/lib/calorie-correction.ts`** — Add mode-based caps:

| Mode | Recovery Days | Surplus Cap | Deficit Recovery |
|------|--------------|-------------|-----------------|
| Aggressive | 2–3 | 25% | 50% |
| Balanced | 3–5 | 20% | 40% |
| Flexible | 4–6 | 15% | 30% |

Modify `getAdjustedDailyTarget()` and `updateCalorieBank()` to read `correctionMode` from state and apply the corresponding caps.

**`src/pages/Profile.tsx`** — Add a "Correction Mode" setting row (alongside existing Tracking Mode toggle). Three options: Aggressive / Balanced / Flexible. Store via a new `setCorrectionMode()` function.

### Priority 4: Adherence Tracking

**`src/lib/calorie-correction.ts`** — Add `getAdherenceScore()`:
- Over rolling 7 days, compute `mealsLogged / mealsPlanned`.
- If adherence < 0.5, reduce correction intensity by 30% (softer adjustments).
- Return `{ score: number, label: string }`.

**`src/pages/Dashboard.tsx`** — Show adherence score as a small stat near the calorie ring (e.g., "Adherence: 82%").

### Priority 5: Failure Handling

**`src/lib/calorie-correction.ts`** — In `updateCalorieBank()`:
- Track `consecutiveSurplusDays` (already exists).
- If > 3, reduce `adjustmentPerDay` by 30% and extend window to max 7 days.
- If `consecutiveDeficitDays` > 3 (new field), gradually return target to original (shrink recovery boost by 50% each day).
- Show supportive message: "Consistency matters more than perfection."

### Priority 6: Confidence Scoring

**`src/lib/store.ts`** — Add optional `confidenceScore?: number` to `FoodItem`.

**`src/lib/calorie-correction.ts`** — Add `getAverageConfidence(log)`:
- Compute weighted average confidence from logged items (camera: 0.7, manual: 0.9, voice: 0.6, default: 0.85).
- If average < 0.7, reduce adjustment intensity by 30%.

**Logging components** (`AddFoodSheet.tsx`, `LogFood.tsx`, camera flow) — Set `confidenceScore` on items based on input method.

### Priority 7: Special Day Types

**`src/lib/calorie-correction.ts`** — Add `setDayType(date, type)` and `getDayType(date)`:
- `cheat`: bank still tracks diff but no adjustment is applied for that day's meals.
- `recovery`: half-intensity correction.
- `fasting`: target set to 0, no logging expected, no bank update.

**`src/pages/Dashboard.tsx`** — Add a small day-type selector (dropdown or chip) near the date header. Default "Normal".

Modify `getAdjustedDailyTarget()` to check day type and skip/reduce adjustments accordingly.

### Priority 8: Auto-Adjust Toggle

**`src/lib/calorie-correction.ts`** — Add `setAutoAdjust(on: boolean)` and `getAutoAdjust()`.

When OFF, `getAdjustedDailyTarget()` returns the original target but `getCalorieBankSummary()` still shows the bank status as a recommendation. The bank continues tracking.

**`src/pages/Profile.tsx`** — Add "Auto Adjust Meals" toggle in settings.

### Priority 9: Balance Streak

**`src/lib/calorie-correction.ts`** — In `processEndOfDay()`:
- If yesterday's `|diff| <= 100`, increment `balanceStreak`.
- Otherwise reset to 0.

**`src/pages/Dashboard.tsx`** — Show streak badge when > 0: "3 days balanced" with a small flame icon.

### Priority 10: Time-Based Day Cutoff

**`src/lib/calorie-correction.ts`** — Add `getEffectiveDate()`:
- If current hour < `dayCutoffHour` (default 3 AM), return yesterday's date.
- Use this in `updateCalorieBank()` and `getAdjustedDailyTarget()` instead of raw `new Date()`.

### Priority 11: Standardized API Contract

**`src/lib/calorie-correction.ts`** — Add new function `getEngineResponse(profile, log)`:
```ts
interface EngineResponse {
  adjustedCalories: number;
  originalCalories: number;
  proteinTarget: number;
  bankStatus: 'surplus' | 'deficit' | 'balanced';
  bankAmount: number;
  adjustmentsApplied: Array<{ date: string; adjust: number }>;
  confidenceScore: number;
  warnings: string[];
  adherenceScore: number;
  balanceStreak: number;
  dayType: string;
  correctionMode: string;
}
```
This is a convenience wrapper for UI components to consume all engine state in one call.

### Files Changed Summary
1. `src/lib/calorie-correction.ts` — Extended state, modes, adherence, failure handling, confidence, day types, auto-adjust, balance streak, cutoff, API contract
2. `src/lib/meal-adjustment.ts` — Meal locking (locked vs flexible items)
3. `src/lib/store.ts` — Add `confidenceScore` to `FoodItem`
4. `src/pages/Profile.tsx` — Add Correction Mode selector + Auto Adjust toggle
5. `src/pages/Dashboard.tsx` — Adherence score display, balance streak badge, day type selector
6. `src/components/AddFoodSheet.tsx` / `src/pages/LogFood.tsx` — Set confidence scores on food items

### What This Does NOT Change
- Existing PES system, grocery mode, budget engine — all untouched
- Existing `recalculateDay()` in `calorie-engine.ts` — already uses `getAdjustedDailyTarget()`
- Progress page CalorieBalanceCard — already working, no changes needed
- localStorage remains primary storage (IndexedDB migration deferred to future)

