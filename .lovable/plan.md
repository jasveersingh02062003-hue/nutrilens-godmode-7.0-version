

# Plan: Deterministic Smart Calorie Correction Engine

## Problem
The current engine stores a `CalorieBankState` in localStorage and incrementally patches it on every meal log. This causes stacking bugs, duplicate sources, and exponential growth of adjustment values. The user's spec calls for a **pure recomputation model** where daily logs are the only source of truth.

## Architecture Change

**Current**: Stateful — `nutrilens_calorie_bank` localStorage key holds cumulative state, mutated on every meal log.

**New**: Deterministic — all adjustment data is **recomputed from raw daily logs** on every read. No stored correction state needed for future calculations. Past days still freeze their `adjustedTarget` in the daily log via `processEndOfDay`.

```text
Daily Logs (localStorage)  ──►  computeAdjustmentMap()  ──►  UI
     (source of truth)              (pure function)
```

## Changes

### 1. `src/lib/calorie-correction.ts` — Core engine rewrite

**Add pure functions** (no localStorage reads/writes):

- `computeAdjustmentMap(pastLogs, baseTarget)` — iterates all past daily logs, computes surplus/deficit for each, spreads adjustments into a `Record<string, number>` map. Surplus > 800 spreads over 5 days, else 4. Deficit recovery = `min(|diff| * 0.3, 250)` applied to next day only.

- `computeAdjustedTarget(date, baseTarget, pastLogs)` — for past dates with frozen `adjustedTarget`, returns that. Otherwise computes from `computeAdjustmentMap` using only logs before `date`. Clamps to `[1200, baseTarget * 1.15]`.

- `computeBreakdownForDate(targetDate, pastLogs, baseTarget)` — iterates past logs, finds which days contribute adjustments to `targetDate`, groups by sourceDate, returns `AdjustmentBreakdownEntry[]`.

- `computeDinnerSummary(todayLog, baseTarget, allPastLogs)` — computes diff, builds message, computes tomorrow's target using `computeAdjustedTarget`.

**Keep existing stateful functions** but simplify them:
- `updateCalorieBank` — simplified to just update `dailyBalances` (for the weekly/monthly summary UI) and call `notifyUICallbacks()`. No more plan building or source merging.
- `processEndOfDay` — freezes `adjustedTarget` on yesterday's daily log entry using `computeAdjustedTarget`. Cleans old data.
- `getAdjustedDailyTarget` — delegates to `computeAdjustedTarget` with today's date.
- Remove `buildAdjustmentPlan`, `mergePlans`, `mergeSources`, `stripSourceDay` — no longer needed.

**Keep unchanged**: `getCalorieBankSummary`, `getDailyBalances`, `getMonthlyStats`, `getWeekendPattern`, `getCorrectionMessage`, `getContextualMealToast`, `getEngineResponse`, `getAdjustmentExplanation`, `getAdjustmentDetails`, adherence/confidence functions, mode/day-type setters.

**Modify `getAdjustmentDetails`** to use `computeAdjustmentMap` and `computeBreakdownForDate` instead of reading stored `adjustmentSources`.

**Modify `getAdjustmentExplanation`** to use `computeBreakdownForDate` instead of reading stored sources.

**Modify `getDinnerNotificationSummary`** to be the new pure `computeDinnerSummary`.

### 2. `src/lib/calendar-helpers.ts` — Use pure functions

- `getFutureDayPlan` — change to accept `adjMap: Record<string, number>` instead of `CalorieBankState`. Look up `adjMap[date]` directly instead of searching an array.
- `getAdjustmentBreakdownForDate` — change signature to accept `pastLogs` and `baseTarget`, delegate to `computeBreakdownForDate`.
- `getDayStatus` and `getExplanationMessage` — unchanged.

### 3. `src/components/DayDetailsSheet.tsx` — Update `FutureDayPlanSection`

- Import `computeAdjustmentMap`, `computeBreakdownForDate` from calorie-correction instead of `getCalorieBankState`.
- Call `computeAdjustmentMap` with recent logs to get the map.
- Pass map to `getFutureDayPlan`.
- Call `computeBreakdownForDate` for the breakdown.

### 4. `src/pages/Progress.tsx` — Update calendar data

- Replace `getCalorieBankState()` with `computeAdjustmentMap(pastLogs, baseTarget)`.
- Use the map directly for future day indicators instead of `state.adjustmentPlan.find()`.
- Pass map to `getFutureDayPlan` calls.

### 5. `src/pages/LogFood.tsx` — Simplify post-log flow

- `updateCalorieBank()` call stays but now just updates balances + notifies UI.
- `getDinnerNotificationSummary` call updated to use new pure signature (pass pastLogs).

### 6. `src/components/MealDetailSheet.tsx` — Same updates as LogFood

- Update `getDinnerNotificationSummary` calls to new signature.
- `updateCalorieBank` calls stay.

### 7. `src/components/QuickLogSheet.tsx` — No changes needed

`updateCalorieBank()` call stays (simplified internally).

## Key Rules Enforced

| Rule | Implementation |
|------|---------------|
| Past = stored | `computeAdjustedTarget` returns frozen value from daily log for past dates |
| Future = computed | Always recomputed from raw logs via `computeAdjustmentMap` |
| Protein locked | `getFutureDayPlan` always uses `profile.dailyProtein` unchanged |
| Safety clamp | `[1200, baseTarget * 1.15]` enforced in `computeAdjustedTarget` |
| No duplication | No stored sources to duplicate — breakdown computed fresh each time |
| Deterministic | Same logs → same output, always |

## Files Modified

| File | Change |
|------|--------|
| `src/lib/calorie-correction.ts` | Add pure compute functions, simplify stateful ones, remove merge/strip helpers |
| `src/lib/calendar-helpers.ts` | Update signatures to use `adjMap` and `pastLogs` instead of `CalorieBankState` |
| `src/components/DayDetailsSheet.tsx` | Use new pure functions in `FutureDayPlanSection` |
| `src/pages/Progress.tsx` | Use `computeAdjustmentMap` for calendar indicators |
| `src/pages/LogFood.tsx` | Update dinner notification call signature |
| `src/components/MealDetailSheet.tsx` | Update dinner notification call signature |

