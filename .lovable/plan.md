

# Plan: Harden Deterministic Calorie Engine (6 Refinements)

## What's Already Working
The deterministic recomputation model is in place: `computeAdjustmentMap`, `computeAdjustedTarget`, `computeBreakdownForDate`, `computeDinnerSummary` are all pure functions. Calendar memoization via `useMemo` is already in Progress.tsx. Protein lock and 1200 kcal safety clamp are active.

## Remaining Gaps

### 1. effectiveTarget bug — double correction distortion
**Current (line 239-240 in calorie-correction.ts):**
```typescript
const target = day.target || baseTarget;
const diff = day.actual - target;
```
This uses the **original** target, not the adjusted target. If Day 1 surplus caused Day 2's target to drop, Day 2's diff should be computed against the adjusted target — otherwise the engine double-corrects.

**Fix**: In `computeAdjustmentMap` and `computeBreakdownForDate`, use `day.adjustedTarget ?? day.target ?? baseTarget` as the effective target for each day's diff calculation.

### 2. Incomplete day guard
Days with very low actual calories (e.g., user opened app but didn't log) create false deficit signals.

**Fix**: In `computeAdjustmentMap` and `computeBreakdownForDate`, skip days where `day.actual < 300`. The existing `day.actual > 0` filter is insufficient.

### 3. Enhanced dinner summary with granular pending info
`computeDinnerSummary` currently returns only `pendingAdjustment` (total). Users need tomorrow-specific and near-term context.

**Fix**: Return expanded object:
```typescript
{
  message: string;
  tomorrowTarget: number;
  tomorrowImpact: number;      // adjMap[tomorrow] only
  next3DaysImpact: number;     // sum of adjMap for next 3 days
  totalPending: number;        // sum of all future adjustments
}
```
Update the message to include tomorrow's specific impact rather than just the total pending.

### 4. Human-readable reason/impact in breakdown entries
Currently breakdown entries have raw numbers. Users need context like "Ate +400 kcal over" and "→ -100 kcal".

**Fix**: Add `reason` and `impactLabel` fields to `AdjustmentBreakdownEntry` in `calendar-helpers.ts`:
```typescript
export interface AdjustmentBreakdownEntry {
  sourceDate: string;
  surplus: number;
  appliedAdjustment: number;
  reason: string;        // "Ate +400 kcal over target"
  impactLabel: string;   // "→ -100 kcal today"
}
```
Populate in `getAdjustmentBreakdownForDate`. Update `DayDetailsSheet.tsx` to display `reason` and `impactLabel` instead of raw numbers.

### 5. Freeze timing documentation + guard
`processEndOfDay` already triggers on first app open after midnight (`lastProcessedDate < today`). Add a guard: also trigger when user logs first meal of a new day (in `updateCalorieBank`, if today differs from `lastProcessedDate`, call `processEndOfDay` first).

### 6. DayDetailsSheet memoization
`FutureDayPlanSection` calls `getCalorieBankState()` and `computeAdjustmentMap` on every render without memoization.

**Fix**: Wrap the computation in `useMemo` keyed on `date` and the state's `dailyBalances`.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/calorie-correction.ts` | Fix effectiveTarget in `computeAdjustmentMap` and `computeBreakdownForDate`; add `actual < 300` guard; expand `computeDinnerSummary` return type; trigger `processEndOfDay` from `updateCalorieBank` on day change |
| `src/lib/calendar-helpers.ts` | Add `reason`/`impactLabel` to `AdjustmentBreakdownEntry`; populate in `getAdjustmentBreakdownForDate` |
| `src/components/DayDetailsSheet.tsx` | Display `reason`/`impactLabel` in breakdown UI; add `useMemo` to `FutureDayPlanSection` |
| `src/pages/LogFood.tsx` | Update `computeDinnerSummary` call to handle expanded return type |
| `src/components/MealDetailSheet.tsx` | Same dinner summary update |

